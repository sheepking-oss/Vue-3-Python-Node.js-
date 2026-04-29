import time
import random
import re
import json
import logging
import asyncio
from typing import Dict, Any, Optional, Tuple, List
from dataclasses import dataclass
from contextlib import contextmanager

import requests
from fake_useragent import UserAgent
from bs4 import BeautifulSoup

try:
    import undetected_chromedriver as uc
    UC_AVAILABLE = True
except ImportError:
    UC_AVAILABLE = False

try:
    from curl_cffi import requests as curl_requests
    CURL_CFFI_AVAILABLE = True
except ImportError:
    CURL_CFFI_AVAILABLE = False

import config

logger = logging.getLogger(__name__)


@dataclass
class RequestResult:
    success: bool
    response: Any = None
    html: str = ''
    json_data: Any = None
    error: str = ''


class FingerprintGenerator:
    def __init__(self):
        self.ua = UserAgent()
        self._screen_resolutions = [
            (1920, 1080), (1366, 768), (1440, 900), (1536, 864),
            (1600, 900), (1280, 720), (1280, 1024), (1024, 768),
            (2560, 1440), (3840, 2160)
        ]
        self._languages = [
            'zh-CN,zh;q=0.9,en;q=0.8',
            'zh-CN,zh;q=0.9',
            'en-US,en;q=0.9,zh-CN;q=0.8,zh;q=0.7',
            'zh-CN,zh;q=0.8,zh-TW;q=0.7,zh-HK;q=0.5,en-US;q=0.3,en;q=0.2'
        ]
        self._timezones = [
            'Asia/Shanghai', 'Asia/Hong_Kong', 'Asia/Taipei', 'Asia/Singapore'
        ]
    
    def generate_headers(self, referer: str = None, platform: str = None) -> Dict[str, str]:
        headers = {
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.9',
            'Accept-Language': random.choice(self._languages),
            'Accept-Encoding': 'gzip, deflate, br',
            'Connection': 'keep-alive',
            'Upgrade-Insecure-Requests': '1',
            'sec-ch-ua': '"Not/A)Brand";v="99", "Google Chrome";v="115", "Chromium";v="115"',
            'sec-ch-ua-mobile': '?0',
            'sec-ch-ua-platform': '"Windows"',
            'sec-fetch-dest': 'document',
            'sec-fetch-mode': 'navigate',
            'sec-fetch-site': 'none',
            'sec-fetch-user': '?1',
            'User-Agent': self.ua.random
        }
        
        if referer:
            headers['Referer'] = referer
        
        return headers
    
    def generate_fingerprint(self) -> Dict[str, Any]:
        width, height = random.choice(self._screen_resolutions)
        
        return {
            'screen_width': width,
            'screen_height': height,
            'screen_color_depth': random.choice([24, 32]),
            'timezone': random.choice(self._timezones),
            'timezone_offset': -480,
            'language': random.choice(self._languages).split(',')[0],
            'plugins_count': random.randint(3, 8),
            'canvas_fingerprint': self._generate_canvas_hash(),
            'webgl_vendor': random.choice([
                'Intel Inc.', 'NVIDIA Corporation', 'AMD', 'Apple Inc.'
            ]),
            'webgl_renderer': random.choice([
                'Intel Iris OpenGL Engine',
                'ANGLE (Intel(R) HD Graphics 630 Direct3D11 vs_5_0 ps_5_0)',
                'NVIDIA GeForce GTX 1060/PCIe/SSE2'
            ])
        }
    
    def _generate_canvas_hash(self) -> str:
        import hashlib
        data = ''.join(random.choices('abcdef0123456789', k=32))
        return hashlib.md5(data.encode()).hexdigest()


class DynamicDelay:
    def __init__(self, base_delay: Tuple[float, float] = (1, 3)):
        self.base_delay = base_delay
        self.last_request_time = 0
        self.request_count = 0
        self.consecutive_success = 0
        self.consecutive_failures = 0
    
    def calculate_delay(self, success: bool = True) -> float:
        if success:
            self.consecutive_success += 1
            self.consecutive_failures = 0
            factor = max(0.5, 1 - (self.consecutive_success * 0.05))
        else:
            self.consecutive_failures += 1
            self.consecutive_success = 0
            factor = min(5.0, 1 + (self.consecutive_failures * 0.5))
        
        base = random.uniform(self.base_delay[0], self.base_delay[1])
        delay = base * factor
        
        jitter = random.uniform(-0.3, 0.3)
        delay = max(0.5, delay * (1 + jitter))
        
        logger.debug(f"计算延迟: {delay:.2f}秒 (success={success}, factor={factor:.2f})")
        return delay
    
    def wait(self, success: bool = True):
        delay = self.calculate_delay(success)
        time.sleep(delay)
        self.last_request_time = time.time()
        self.request_count += 1
    
    def reset(self):
        self.consecutive_success = 0
        self.consecutive_failures = 0


class ProxyRotator:
    def __init__(self, proxies: List[str] = None):
        self.proxies = proxies or []
        self.current_index = 0
        self.failed_proxies = set()
        self.success_counts = {}
    
    def add_proxy(self, proxy: str):
        if proxy not in self.proxies:
            self.proxies.append(proxy)
    
    def get_proxy(self) -> Optional[str]:
        if not self.proxies:
            return None
        
        available = [p for p in self.proxies if p not in self.failed_proxies]
        if not available:
            logger.warning("所有代理都已标记为失败，重置失败列表")
            self.failed_proxies.clear()
            available = self.proxies
        
        self.current_index = (self.current_index + 1) % len(available)
        return available[self.current_index]
    
    def mark_failed(self, proxy: str):
        self.failed_proxies.add(proxy)
        logger.warning(f"代理 {proxy} 标记为失败")
    
    def mark_success(self, proxy: str):
        if proxy in self.failed_proxies:
            self.failed_proxies.remove(proxy)
        self.success_counts[proxy] = self.success_counts.get(proxy, 0) + 1
    
    def get_requests_proxy_format(self, proxy: str) -> Dict[str, str]:
        if not proxy:
            return {}
        return {
            'http': proxy,
            'https': proxy
        }


class RequestDispatcher:
    def __init__(self):
        self.fingerprint = FingerprintGenerator()
        self.delay = DynamicDelay(config.REQUEST_DELAY)
        self.proxy_rotator = ProxyRotator()
        self.session = requests.Session()
        self.use_curl_cffi = CURL_CFFI_AVAILABLE
    
    def make_request(
        self,
        url: str,
        method: str = 'GET',
        params: Dict = None,
        data: Dict = None,
        headers: Dict = None,
        cookies: Dict = None,
        proxy: str = None,
        timeout: int = config.TIMEOUT,
        max_retries: int = config.MAX_RETRIES,
        allow_redirects: bool = True
    ) -> RequestResult:
        
        if headers is None:
            headers = self.fingerprint.generate_headers()
        
        if cookies:
            cookie_str = '; '.join([f'{k}={v}' for k, v in cookies.items()])
            headers['Cookie'] = cookie_str
        
        use_proxy = proxy or self.proxy_rotator.get_proxy()
        proxies = self.proxy_rotator.get_requests_proxy_format(use_proxy)
        
        for attempt in range(max_retries):
            try:
                self.delay.wait(success=(attempt == 0))
                
                logger.debug(f"请求尝试 {attempt + 1}/{max_retries}: {method} {url}")
                
                if self.use_curl_cffi and CURL_CFFI_AVAILABLE:
                    response = curl_requests.request(
                        method=method,
                        url=url,
                        params=params,
                        data=data,
                        headers=headers,
                        proxies=proxies if proxies else None,
                        timeout=timeout,
                        allow_redirects=allow_redirects,
                        impersonate='chrome110'
                    )
                else:
                    if method.upper() == 'GET':
                        response = self.session.get(
                            url,
                            params=params,
                            headers=headers,
                            proxies=proxies if proxies else None,
                            timeout=timeout,
                            allow_redirects=allow_redirects
                        )
                    else:
                        response = self.session.post(
                            url,
                            params=params,
                            data=data,
                            headers=headers,
                            proxies=proxies if proxies else None,
                            timeout=timeout,
                            allow_redirects=allow_redirects
                        )
                
                response.raise_for_status()
                
                if self._check_for_anti_crawler(response.text):
                    logger.warning(f"检测到反爬机制，尝试 {attempt + 1}/{max_retries}")
                    self.delay.reset()
                    if use_proxy:
                        self.proxy_rotator.mark_failed(use_proxy)
                    continue
                
                if use_proxy:
                    self.proxy_rotator.mark_success(use_proxy)
                
                return self._parse_response(response)
                
            except requests.exceptions.RequestException as e:
                logger.warning(f"请求异常 (尝试 {attempt + 1}/{max_retries}): {e}")
                if use_proxy:
                    self.proxy_rotator.mark_failed(use_proxy)
                self.delay.reset()
                
                if attempt == max_retries - 1:
                    return RequestResult(
                        success=False,
                        error=str(e)
                    )
        
        return RequestResult(success=False, error="Max retries exceeded")
    
    def _check_for_anti_crawler(self, html: str) -> bool:
        anti_crawler_patterns = [
            r'验证码',
            r'滑动验证',
            r'安全验证',
            r'访问被拒绝',
            r'访问限制',
            r'请登录',
            r'登录后查看',
            r'Robot Check',
            r'captcha',
            r'blocked',
            r'redirect.*verify',
            r'js\s*cookie',
            r'setTimeout.*location',
            r'window\.location\.replace'
        ]
        
        for pattern in anti_crawler_patterns:
            if re.search(pattern, html, re.IGNORECASE):
                return True
        
        if len(html) < 500 and 'html' not in html.lower():
            return True
        
        return False
    
    def _parse_response(self, response) -> RequestResult:
        html = response.text
        
        json_data = None
        try:
            json_data = response.json()
        except (json.JSONDecodeError, ValueError):
            pass
        
        return RequestResult(
            success=True,
            response=response,
            html=html,
            json_data=json_data
        )


class SeleniumBrowser:
    def __init__(self, headless: bool = True, use_undetected: bool = True):
        self.driver = None
        self.headless = headless
        self.use_undetected = use_undetected and UC_AVAILABLE
    
    def init_driver(self):
        if self.driver:
            return
        
        options = None
        
        if self.use_undetected and UC_AVAILABLE:
            options = uc.ChromeOptions()
        else:
            try:
                from selenium import webdriver
                from selenium.webdriver.chrome.options import Options
                options = Options()
            except ImportError:
                logger.error("Selenium未安装，无法使用浏览器模式")
                return
        
        if self.headless:
            options.add_argument('--headless')
        
        options.add_argument('--disable-blink-features=AutomationControlled')
        options.add_argument('--disable-dev-shm-usage')
        options.add_argument('--no-sandbox')
        options.add_argument('--disable-gpu')
        options.add_argument('--window-size=1920,1080')
        options.add_argument('--lang=zh-CN,zh')
        options.add_argument('--disable-infobars')
        options.add_argument('--disable-extensions')
        
        prefs = {
            'profile.default_content_setting_values': {
                'images': 2,
                'javascript': 1,
                'geolocation': 2,
                'notifications': 2,
                'auto_select_certificate': 2,
                'fullscreen': 2,
                'mouselock': 2,
                'mixed_script': 2,
                'media_stream': 2,
                'media_stream_mic': 2,
                'media_stream_camera': 2,
                'protocol_handlers': 2,
                'ppapi_broker': 2,
                'automatic_downloads': 2,
                'midi_sysex': 2,
                'push_messaging': 2,
                'ssl_cert_decisions': 2,
                'metro_switch_to_desktop': 2,
                'protected_media_identifier': 2,
                'app_banner': 2,
                'site_engagement': 2,
                'durable_storage': 2
            }
        }
        options.add_experimental_option('prefs', prefs)
        options.add_experimental_option('excludeSwitches', ['enable-automation'])
        options.add_experimental_option('useAutomationExtension', False)
        
        if self.use_undetected and UC_AVAILABLE:
            self.driver = uc.Chrome(options=options)
        else:
            from selenium import webdriver
            from selenium.webdriver.chrome.service import Service
            from webdriver_manager.chrome import ChromeDriverManager
            
            service = Service(ChromeDriverManager().install())
            self.driver = webdriver.Chrome(service=service, options=options)
            
            self.driver.execute_cdp_cmd(
                'Page.addScriptToEvaluateOnNewDocument',
                {
                    'source': '''
                        Object.defineProperty(navigator, 'webdriver', {
                            get: () => undefined
                        });
                        Object.defineProperty(navigator, 'plugins', {
                            get: () => [1, 2, 3, 4, 5]
                        });
                        Object.defineProperty(navigator, 'languages', {
                            get: () => ['zh-CN', 'zh', 'en']
                        });
                    '''
                }
            )
        
        self.driver.implicitly_wait(10)
    
    def get_page(self, url: str, wait_time: int = 3) -> str:
        if not self.driver:
            self.init_driver()
        
        self.driver.get(url)
        time.sleep(wait_time)
        
        return self.driver.page_source
    
    def scroll_page(self, times: int = 3, delay: float = 1.0):
        if not self.driver:
            return
        
        for i in range(times):
            self.driver.execute_script(
                f"window.scrollTo(0, document.body.scrollHeight * {(i + 1) / times});"
            )
            time.sleep(delay)
    
    def get_cookies(self) -> List[Dict]:
        if not self.driver:
            return []
        return self.driver.get_cookies()
    
    def add_cookies(self, cookies: List[Dict]):
        if not self.driver:
            self.init_driver()
        
        for cookie in cookies:
            try:
                self.driver.add_cookie(cookie)
            except Exception as e:
                logger.debug(f"添加Cookie失败: {e}")
    
    def execute_script(self, script: str):
        if not self.driver:
            return None
        return self.driver.execute_script(script)
    
    def quit(self):
        if self.driver:
            try:
                self.driver.quit()
            except Exception as e:
                logger.debug(f"关闭浏览器失败: {e}")
            finally:
                self.driver = None
    
    def __enter__(self):
        self.init_driver()
        return self
    
    def __exit__(self, exc_type, exc_val, exc_tb):
        self.quit()


class PriceExtractor:
    @staticmethod
    def extract_price_from_text(text: str) -> float:
        if not text:
            return 0.0
        
        text = text.strip()
        
        patterns = [
            r'[￥¥]?\s*(\d+(?:[.,]\d+)?)\s*元?',
            r'price\s*[=:]\s*["\']?(\d+(?:[.,]\d+)?)["\']?',
            r'(\d+(?:[.,]\d+)?)\s*<\/?[bi]>',
            r'data-price\s*=\s*["\'](\d+(?:[.,]\d+)?)["\']',
            r'class=["\'][^"\']*price[^"\']*["\'][^>]*>\s*[￥¥]?\s*(\d+(?:[.,]\d+)?)'
        ]
        
        for pattern in patterns:
            match = re.search(pattern, text, re.IGNORECASE)
            if match:
                price_str = match.group(1)
                price_str = price_str.replace(',', '')
                try:
                    return float(price_str)
                except ValueError:
                    continue
        
        return 0.0
    
    @staticmethod
    def extract_price_from_json(json_data: Any, 
                                   possible_keys: List[str] = None) -> float:
        if possible_keys is None:
            possible_keys = [
                'price', 'p', 'op', 'm', 'w',
                'skuPrice', 'skuprice',
                'currentPrice', 'current_price',
                'salePrice', 'sale_price',
                'jdPrice', 'jdprice',
                'minPrice', 'min_price',
                'maxPrice', 'max_price',
                'priceWap', 'pricepc'
            ]
        
        if isinstance(json_data, dict):
            for key in possible_keys:
                if key in json_data:
                    value = json_data[key]
                    if isinstance(value, (int, float)):
                        return float(value)
                    elif isinstance(value, str):
                        return PriceExtractor.extract_price_from_text(value)
            
            for key, value in json_data.items():
                if isinstance(value, (dict, list)):
                    result = PriceExtractor.extract_price_from_json(value, possible_keys)
                    if result > 0:
                        return result
        
        elif isinstance(json_data, list):
            for item in json_data:
                result = PriceExtractor.extract_price_from_json(item, possible_keys)
                if result > 0:
                    return result
        
        return 0.0
    
    @staticmethod
    def extract_prices_from_html(html: str) -> List[Dict]:
        prices = []
        
        script_pattern = r'<script[^>]*>([\s\S]*?)</script>'
        for match in re.finditer(script_pattern, html, re.IGNORECASE):
            script_content = match.group(1)
            
            json_patterns = [
                r'var\s+\w+\s*=\s*(\[[\s\S]*?\]);',
                r'var\s+\w+\s*=\s*(\{[\s\S]*?\});',
                r'window\.\w+\s*=\s*(\{[\s\S]*?\});',
                r'"?\w+"?\s*:\s*(\[[\s\S]*?\])',
            ]
            
            for json_pattern in json_patterns:
                for json_match in re.finditer(json_pattern, script_content):
                    try:
                        json_str = json_match.group(1)
                        data = json.loads(json_str)
                        price = PriceExtractor.extract_price_from_json(data)
                        if price > 0:
                            prices.append({
                                'price': price,
                                'source': 'script_json'
                            })
                    except (json.JSONDecodeError, ValueError):
                        continue
        
        soup = BeautifulSoup(html, 'html.parser')
        price_selectors = [
            '.p-price i',
            '.p-price .price',
            '.price strong',
            '.g_price strong',
            '[class*="price"]',
            '[class*="Price"]',
            '[id*="price"]',
            '[id*="Price"]',
            'span[class*="price"]',
            'strong[class*="price"]',
            'em[class*="price"]',
            'i[class*="price"]'
        ]
        
        for selector in price_selectors:
            elements = soup.select(selector)
            for elem in elements:
                price_text = elem.get_text(strip=True)
                if price_text:
                    price = PriceExtractor.extract_price_from_text(price_text)
                    if price > 0:
                        prices.append({
                            'price': price,
                            'source': f'selector:{selector}'
                        })
        
        return prices
    
    @staticmethod
    def get_best_price(prices: List[Dict]) -> float:
        if not prices:
            return 0.0
        
        valid_prices = [p['price'] for p in prices if p['price'] > 0]
        if not valid_prices:
            return 0.0
        
        from collections import Counter
        price_counts = Counter(valid_prices)
        
        most_common = price_counts.most_common(1)
        if most_common and most_common[0][1] > len(valid_prices) * 0.3:
            return most_common[0][0]
        
        return min(valid_prices)
