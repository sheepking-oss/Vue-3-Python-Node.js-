import os
import json
import pickle
import time
from datetime import datetime, timedelta
from typing import Dict, Optional, List, Any
from dataclasses import dataclass, asdict
import logging

logger = logging.getLogger(__name__)


@dataclass
class CookieEntry:
    name: str
    value: str
    domain: str
    path: str = "/"
    expires: Optional[float] = None
    httpOnly: bool = False
    secure: bool = False
    sameSite: Optional[str] = None
    
    def is_expired(self) -> bool:
        if self.expires is None:
            return False
        return time.time() > self.expires
    
    def to_dict(self) -> Dict[str, Any]:
        return asdict(self)
    
    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> 'CookieEntry':
        return cls(**data)


class CookieManager:
    def __init__(self, cookie_dir: str = None, platform: str = None):
        if cookie_dir is None:
            cookie_dir = os.path.join(os.path.dirname(__file__), 'cookies')
        
        self.cookie_dir = cookie_dir
        self.platform = platform
        self._cookies: Dict[str, CookieEntry] = {}
        self._last_updated: Optional[datetime] = None
        
        os.makedirs(cookie_dir, exist_ok=True)
    
    def _get_cookie_file_path(self, platform: str = None) -> str:
        target_platform = platform or self.platform or 'default'
        return os.path.join(self.cookie_dir, f'{target_platform}_cookies.json')
    
    def _get_cookie_pickle_path(self, platform: str = None) -> str:
        target_platform = platform or self.platform or 'default'
        return os.path.join(self.cookie_dir, f'{target_platform}_cookies.pkl')
    
    def save_cookies(self, cookies: Any, platform: str = None, format: str = 'json') -> bool:
        try:
            cookie_list = []
            
            if hasattr(cookies, 'items'):
                for name, value in cookies.items():
                    cookie_list.append(CookieEntry(
                        name=name,
                        value=value,
                        domain='',
                        expires=None
                    ))
            elif isinstance(cookies, dict):
                for name, value in cookies.items():
                    cookie_list.append(CookieEntry(
                        name=name,
                        value=value if isinstance(value, str) else str(value),
                        domain='',
                        expires=None
                    ))
            elif hasattr(cookies, '__iter__'):
                for cookie in cookies:
                    if isinstance(cookie, CookieEntry):
                        cookie_list.append(cookie)
                    elif hasattr(cookie, 'get'):
                        cookie_list.append(CookieEntry(
                            name=cookie.get('name', ''),
                            value=cookie.get('value', ''),
                            domain=cookie.get('domain', ''),
                            path=cookie.get('path', '/'),
                            expires=cookie.get('expires'),
                            httpOnly=cookie.get('httpOnly', False),
                            secure=cookie.get('secure', False)
                        ))
            
            cookie_dict = {c.name: c for c in cookie_list}
            self._cookies.update(cookie_dict)
            self._last_updated = datetime.now()
            
            if format == 'json':
                file_path = self._get_cookie_file_path(platform)
                with open(file_path, 'w', encoding='utf-8') as f:
                    json.dump({
                        'platform': platform or self.platform,
                        'last_updated': self._last_updated.isoformat(),
                        'cookies': [c.to_dict() for c in self._cookies.values()]
                    }, f, ensure_ascii=False, indent=2)
            else:
                file_path = self._get_cookie_pickle_path(platform)
                with open(file_path, 'wb') as f:
                    pickle.dump({
                        'platform': platform or self.platform,
                        'last_updated': self._last_updated,
                        'cookies': self._cookies
                    }, f)
            
            logger.info(f"保存了 {len(cookie_list)} 个Cookie到 {file_path}")
            return True
            
        except Exception as e:
            logger.error(f"保存Cookie失败: {e}")
            return False
    
    def load_cookies(self, platform: str = None, format: str = 'json') -> Dict[str, str]:
        try:
            if format == 'json':
                file_path = self._get_cookie_file_path(platform)
                if not os.path.exists(file_path):
                    logger.warning(f"Cookie文件不存在: {file_path}")
                    return {}
                
                with open(file_path, 'r', encoding='utf-8') as f:
                    data = json.load(f)
                
                cookie_entries = data.get('cookies', [])
                self._cookies = {
                    c['name']: CookieEntry.from_dict(c) 
                    for c in cookie_entries
                }
                
                if data.get('last_updated'):
                    self._last_updated = datetime.fromisoformat(data['last_updated'])
            
            else:
                file_path = self._get_cookie_pickle_path(platform)
                if not os.path.exists(file_path):
                    return {}
                
                with open(file_path, 'rb') as f:
                    data = pickle.load(f)
                
                self._cookies = data.get('cookies', {})
                self._last_updated = data.get('last_updated')
            
            valid_cookies = {
                name: entry 
                for name, entry in self._cookies.items() 
                if not entry.is_expired()
            }
            
            logger.info(f"加载了 {len(valid_cookies)} 个有效Cookie")
            return {k: v.value for k, v in valid_cookies.items()}
            
        except Exception as e:
            logger.error(f"加载Cookie失败: {e}")
            return {}
    
    def get_cookie_string(self, platform: str = None) -> str:
        cookies = self.load_cookies(platform)
        return '; '.join([f'{k}={v}' for k, v in cookies.items()])
    
    def get_cookie_dict(self, platform: str = None) -> Dict[str, str]:
        return self.load_cookies(platform)
    
    def add_cookie(self, name: str, value: str, domain: str = '', 
                   path: str = '/', expires: Optional[float] = None):
        self._cookies[name] = CookieEntry(
            name=name,
            value=value,
            domain=domain,
            path=path,
            expires=expires
        )
        self._last_updated = datetime.now()
    
    def remove_cookie(self, name: str):
        if name in self._cookies:
            del self._cookies[name]
            self._last_updated = datetime.now()
    
    def clear_expired(self) -> int:
        expired_count = 0
        to_remove = []
        
        for name, entry in self._cookies.items():
            if entry.is_expired():
                to_remove.append(name)
                expired_count += 1
        
        for name in to_remove:
            del self._cookies[name]
        
        if expired_count > 0:
            self._last_updated = datetime.now()
            logger.info(f"清理了 {expired_count} 个过期Cookie")
        
        return expired_count
    
    def clear_all(self):
        self._cookies.clear()
        self._last_updated = datetime.now()
    
    def get_cookies_for_selenium(self, platform: str = None) -> List[Dict[str, Any]]:
        self.load_cookies(platform)
        return [
            {
                'name': entry.name,
                'value': entry.value,
                'domain': entry.domain,
                'path': entry.path,
                'expiry': int(entry.expires) if entry.expires else None,
                'httpOnly': entry.httpOnly,
                'secure': entry.secure
            }
            for entry in self._cookies.values()
        ]
    
    def is_cookie_valid(self, platform: str = None) -> bool:
        cookies = self.load_cookies(platform)
        if not cookies:
            return False
        
        if self._last_updated:
            max_age = timedelta(hours=24)
            if datetime.now() - self._last_updated > max_age:
                logger.warning("Cookie已超过24小时，可能已过期")
                return False
        
        return True
    
    def get_last_updated(self) -> Optional[datetime]:
        return self._last_updated


class BrowserCookieExporter:
    def __init__(self, cookie_manager: CookieManager):
        self.cookie_manager = cookie_manager
    
    def export_from_browser(self, driver, platform: str = None):
        try:
            cookies = driver.get_cookies()
            logger.info(f"从浏览器获取到 {len(cookies)} 个Cookie")
            self.cookie_manager.save_cookies(cookies, platform)
            return True
        except Exception as e:
            logger.error(f"从浏览器导出Cookie失败: {e}")
            return False
    
    def import_to_browser(self, driver, platform: str = None):
        try:
            cookies = self.cookie_manager.get_cookies_for_selenium(platform)
            
            for cookie in cookies:
                try:
                    if cookie.get('domain') and cookie['domain'].startswith('.'):
                        driver.add_cookie(cookie)
                except Exception as e:
                    logger.debug(f"添加Cookie失败: {cookie.get('name')} - {e}")
            
            logger.info(f"导入了 {len(cookies)} 个Cookie到浏览器")
            return True
        except Exception as e:
            logger.error(f"导入Cookie到浏览器失败: {e}")
            return False
