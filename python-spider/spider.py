import time
import random
import json
import re
import logging
import os
import requests
from datetime import datetime
from bs4 import BeautifulSoup
from fake_useragent import UserAgent

import config

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.StreamHandler(),
        logging.FileHandler(config.LOG_PATH) if os.path.exists(os.path.dirname(config.LOG_PATH)) else logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)

os.makedirs(os.path.dirname(config.DATABASE_PATH), exist_ok=True)
os.makedirs(os.path.dirname(config.LOG_PATH), exist_ok=True)

class AntiCrawlerBypass:
    def __init__(self):
        self.ua = UserAgent()
        self.session = requests.Session()
        self.proxies = None
        self._setup_proxies()
    
    def _setup_proxies(self):
        if config.PROXY_SETTINGS['enabled']:
            self.proxies = {
                'http': config.PROXY_SETTINGS['http_proxy'],
                'https': config.PROXY_SETTINGS['https_proxy']
            }
            logger.info(f"使用代理: {self.proxies}")
    
    def get_random_headers(self, referer=None):
        headers = config.DEFAULT_HEADERS.copy()
        headers['User-Agent'] = self.ua.random
        if referer:
            headers['Referer'] = referer
        return headers
    
    def random_delay(self):
        delay = random.uniform(config.REQUEST_DELAY[0], config.REQUEST_DELAY[1])
        logger.debug(f"延迟 {delay:.2f} 秒")
        time.sleep(delay)
    
    def make_request(self, url, method='GET', params=None, data=None, headers=None, retry_count=0):
        if retry_count >= config.MAX_RETRIES:
            logger.error(f"请求失败，已重试 {config.MAX_RETRIES} 次: {url}")
            return None
        
        if headers is None:
            headers = self.get_random_headers()
        
        try:
            self.random_delay()
            
            if method == 'GET':
                response = self.session.get(
                    url,
                    params=params,
                    headers=headers,
                    proxies=self.proxies,
                    timeout=config.TIMEOUT
                )
            elif method == 'POST':
                response = self.session.post(
                    url,
                    params=params,
                    data=data,
                    headers=headers,
                    proxies=self.proxies,
                    timeout=config.TIMEOUT
                )
            
            response.raise_for_status()
            return response
            
        except requests.exceptions.RequestException as e:
            logger.warning(f"请求异常: {e}，重试 {retry_count + 1}/{config.MAX_RETRIES}")
            return self.make_request(url, method, params, data, headers, retry_count + 1)

class KeyboardProductSpider:
    def __init__(self):
        self.anti_crawler = AntiCrawlerBypass()
        self.products = []
        self.comments = []
    
    def extract_product_info(self, html, platform):
        products = []
        soup = BeautifulSoup(html, 'html.parser')
        
        if platform == 'jd':
            items = soup.select('.gl-item')
            for item in items:
                try:
                    product_id = item.get('data-sku')
                    if not product_id:
                        continue
                    
                    name_elem = item.select_one('.p-name a em')
                    name = name_elem.get_text(strip=True) if name_elem else ''
                    
                    price_elem = item.select_one('.p-price i')
                    price = price_elem.get_text(strip=True) if price_elem else '0'
                    try:
                        price = float(price)
                    except ValueError:
                        price = 0.0
                    
                    shop_elem = item.select_one('.p-shop a')
                    shop = shop_elem.get_text(strip=True) if shop_elem else ''
                    
                    img_elem = item.select_one('.p-img img')
                    image_url = img_elem.get('data-lazy-img') or img_elem.get('src') if img_elem else ''
                    if image_url and not image_url.startswith('http'):
                        image_url = 'https:' + image_url
                    
                    product = {
                        'id': f'jd_{product_id}',
                        'platform': '京东',
                        'name': name,
                        'price': price,
                        'original_price': price,
                        'shop': shop,
                        'image_url': image_url,
                        'product_url': f'https://item.jd.com/{product_id}.html',
                        'category': '键盘',
                        'fetch_time': datetime.now().isoformat(),
                        'brand': self._extract_brand(name),
                        'model': self._extract_model(name),
                        'axis_type': self._extract_axis_type(name),
                        'key_count': self._extract_key_count(name)
                    }
                    
                    products.append(product)
                    logger.info(f"抓取到商品: {name} - ¥{price}")
                    
                except Exception as e:
                    logger.error(f"解析京东商品失败: {e}")
                    continue
        
        elif platform == 'tmall' or platform == 'taobao':
            items = soup.select('.item')
            for item in items:
                try:
                    data_id = item.get('data-id') or item.get('data-nid')
                    if not data_id:
                        continue
                    
                    name_elem = item.select_one('.title a') or item.select_one('.J_ClickStat')
                    name = name_elem.get_text(strip=True) if name_elem else ''
                    
                    price_elem = item.select_one('.price strong') or item.select_one('.g_price strong')
                    price = price_elem.get_text(strip=True) if price_elem else '0'
                    try:
                        price = float(price.replace('¥', '').replace(',', ''))
                    except ValueError:
                        price = 0.0
                    
                    shop_elem = item.select_one('.shop a') or item.select_one('.shopName a')
                    shop = shop_elem.get_text(strip=True) if shop_elem else ''
                    
                    img_elem = item.select_one('.pic img') or item.select_one('.J_ItemImg img')
                    image_url = img_elem.get('data-src') or img_elem.get('src') if img_elem else ''
                    if image_url and not image_url.startswith('http'):
                        image_url = 'https:' + image_url
                    
                    platform_name = '天猫' if platform == 'tmall' else '淘宝'
                    
                    product = {
                        'id': f'{platform}_{data_id}',
                        'platform': platform_name,
                        'name': name,
                        'price': price,
                        'original_price': price,
                        'shop': shop,
                        'image_url': image_url,
                        'product_url': f'https://item.taobao.com/item.htm?id={data_id}',
                        'category': '键盘',
                        'fetch_time': datetime.now().isoformat(),
                        'brand': self._extract_brand(name),
                        'model': self._extract_model(name),
                        'axis_type': self._extract_axis_type(name),
                        'key_count': self._extract_key_count(name)
                    }
                    
                    products.append(product)
                    logger.info(f"抓取到商品: {name} - ¥{price}")
                    
                except Exception as e:
                    logger.error(f"解析淘宝/天猫商品失败: {e}")
                    continue
        
        return products
    
    def _extract_brand(self, name):
        brands = ['雷蛇', '罗技', '樱桃', 'Cherry', '斐尔可', 'Filco', '阿米洛', 'Varmilo', 
                  '利奥博德', 'Leopold', 'HHKB', 'Realforce', '宁芝', 'NIZ', '达尔优', 
                  '雷柏', '双飞燕', '腹灵', 'AKKO', 'Keychron', '京东京造', '小米', 
                  'RK', '艾石头', '黑峡谷', 'GANSS', '高斯']
        
        for brand in brands:
            if brand in name or brand.lower() in name.lower():
                return brand
        return '未知品牌'
    
    def _extract_model(self, name):
        patterns = [
            r'(Model\s*\w+)',
            r'(\d{3,4}[A-Za-z]?)',
            r'(Pro\s*\d*)',
            r'(V\d+)',
            r'(MK\d+)',
            r'(K\d+)'
        ]
        
        for pattern in patterns:
            match = re.search(pattern, name, re.IGNORECASE)
            if match:
                return match.group(1)
        return ''
    
    def _extract_axis_type(self, name):
        axis_types = {
            '红轴': ['红轴', 'red'],
            '青轴': ['青轴', 'blue'],
            '茶轴': ['茶轴', 'brown'],
            '黑轴': ['黑轴', 'black'],
            '银轴': ['银轴', 'silver'],
            '黄轴': ['黄轴', 'yellow'],
            '白轴': ['白轴', 'white'],
            '绿轴': ['绿轴', 'green'],
            '静音轴': ['静音', 'silent'],
            '线性轴': ['线性', 'linear'],
            '段落轴': ['段落', 'tactile'],
            'BOX轴': ['BOX', 'box'],
            '樱桃轴': ['樱桃轴', 'Cherry', 'cherry'],
            '佳达隆': ['佳达隆', 'Gateron', 'gateron'],
            '凯华轴': ['凯华', 'Kailh', 'kailh'],
            'TTC轴': ['TTC', 'ttc']
        }
        
        name_lower = name.lower()
        for axis_type, keywords in axis_types.items():
            for keyword in keywords:
                if keyword in name or keyword.lower() in name_lower:
                    return axis_type
        return '未知轴体'
    
    def _extract_key_count(self, name):
        patterns = [
            r'(\d{2,3})\s*键',
            r'(\d{2,3})-key',
            r'(\d{2,3})key'
        ]
        
        for pattern in patterns:
            match = re.search(pattern, name, re.IGNORECASE)
            if match:
                return int(match.group(1))
        
        key_counts = {
            '104': 104, '108': 108, '87': 87, '68': 68, 
            '60': 60, '61': 61, '75': 75, '84': 84, '96': 96
        }
        
        for count_str, count in key_counts.items():
            if count_str in name:
                return count
        
        return None
    
    def search_products(self, keyword, platform='jd'):
        logger.info(f"开始搜索 {platform} 平台的 '{keyword}' 商品...")
        
        platform_config = config.TARGET_PLATFORMS.get(platform)
        if not platform_config:
            logger.error(f"不支持的平台: {platform}")
            return []
        
        search_url = platform_config['search_url'].format(keyword=keyword)
        logger.info(f"搜索URL: {search_url}")
        
        response = self.anti_crawler.make_request(search_url)
        if not response:
            logger.error("搜索请求失败")
            return []
        
        products = self.extract_product_info(response.text, platform)
        logger.info(f"搜索完成，找到 {len(products)} 个商品")
        
        self.products.extend(products)
        return products
    
    def fetch_product_comments(self, product, max_pages=3):
        logger.info(f"开始抓取商品评论: {product['name']}")
        
        comments = []
        platform = product['platform']
        product_id = product['id'].split('_')[-1]
        
        if platform == '京东':
            for page in range(max_pages):
                comment_url = config.TARGET_PLATFORMS['jd']['comment_url'].format(
                    id=product_id, page=page
                )
                
                headers = self.anti_crawler.get_random_headers()
                headers['Referer'] = product['product_url']
                
                response = self.anti_crawler.make_request(comment_url, headers=headers)
                if not response:
                    continue
                
                try:
                    data = response.json()
                    comments_data = data.get('comments', [])
                    
                    for comment_data in comments_data:
                        comment = {
                            'id': f"jd_{comment_data.get('id', '')}",
                            'product_id': product['id'],
                            'content': comment_data.get('content', ''),
                            'score': comment_data.get('score', 5),
                            'user_name': comment_data.get('nickname', ''),
                            'user_level': comment_data.get('userLevelName', ''),
                            'time': comment_data.get('creationTime', ''),
                            'images': comment_data.get('images', []),
                            'useful_count': comment_data.get('usefulVoteCount', 0),
                            'fetch_time': datetime.now().isoformat()
                        }
                        comments.append(comment)
                        logger.debug(f"抓取到评论: {comment['content'][:50]}...")
                        
                except Exception as e:
                    logger.error(f"解析京东评论失败: {e}")
                    continue
        
        logger.info(f"完成抓取，共 {len(comments)} 条评论")
        self.comments.extend(comments)
        return comments
    
    def send_to_api(self, data, endpoint='products'):
        logger.info(f"发送数据到 API: {config.API_URL}")
        
        try:
            response = requests.post(
                f"{config.API_URL}/{endpoint}",
                json=data,
                headers={'Content-Type': 'application/json'},
                timeout=config.TIMEOUT
            )
            response.raise_for_status()
            result = response.json()
            logger.info(f"API 响应: {result}")
            return result
        except Exception as e:
            logger.error(f"发送数据到 API 失败: {e}")
            return None
    
    def run(self, keywords=None, platforms=None, fetch_comments=False):
        if keywords is None:
            keywords = config.TARGET_KEYWORDS
        
        if platforms is None:
            platforms = list(config.TARGET_PLATFORMS.keys())
        
        logger.info("=" * 50)
        logger.info("键盘商品数据抓取任务开始")
        logger.info(f"关键词: {keywords}")
        logger.info(f"平台: {platforms}")
        logger.info(f"抓取评论: {fetch_comments}")
        logger.info("=" * 50)
        
        for platform in platforms:
            for keyword in keywords:
                self.search_products(keyword, platform)
        
        logger.info(f"总共抓取到 {len(self.products)} 个商品")
        
        if fetch_comments and self.products:
            logger.info("开始抓取评论...")
            for product in self.products[:10]:
                self.fetch_product_comments(product)
            logger.info(f"总共抓取到 {len(self.comments)} 条评论")
        
        if self.products:
            logger.info("发送商品数据到 API...")
            self.send_to_api({'products': self.products}, 'products')
        
        if self.comments:
            logger.info("发送评论数据到 API...")
            self.send_to_api({'comments': self.comments}, 'comments')
        
        logger.info("=" * 50)
        logger.info("抓取任务完成!")
        logger.info(f"商品数量: {len(self.products)}")
        logger.info(f"评论数量: {len(self.comments)}")
        logger.info("=" * 50)
        
        return {
            'products': self.products,
            'comments': self.comments
        }

def main():
    spider = KeyboardProductSpider()
    
    result = spider.run(
        keywords=['机械键盘', '客制化键盘'],
        platforms=['jd', 'tmall', 'taobao'],
        fetch_comments=True
    )
    
    return result

if __name__ == '__main__':
    main()
