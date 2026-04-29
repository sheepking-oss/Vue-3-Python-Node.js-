import os
from fake_useragent import UserAgent

BASE_DIR = os.path.dirname(os.path.abspath(__file__))

UA = UserAgent()

DEFAULT_HEADERS = {
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
    'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
    'Accept-Encoding': 'gzip, deflate, br',
    'Connection': 'keep-alive',
    'Upgrade-Insecure-Requests': '1',
}

REQUEST_DELAY = (1, 3)
MAX_RETRIES = 3
TIMEOUT = 30

TARGET_KEYWORDS = [
    '机械键盘',
    '客制化键盘',
    '键盘轴体',
    '键盘键帽'
]

TARGET_PLATFORMS = {
    'jd': {
        'name': '京东',
        'search_url': 'https://search.jd.com/Search?keyword={keyword}&enc=utf-8',
        'product_url': 'https://item.jd.com/{id}.html',
        'comment_url': 'https://club.jd.com/comment/productPageComments.action?productId={id}&score=0&sortType=5&page={page}&pageSize=10'
    },
    'tmall': {
        'name': '天猫',
        'search_url': 'https://list.tmall.com/search_product.htm?q={keyword}',
        'product_url': 'https://detail.tmall.com/item.htm?id={id}',
        'comment_url': 'https://rate.tmall.com/list_detail_rate.htm?itemId={id}&currentPage={page}&pageSize=10'
    },
    'taobao': {
        'name': '淘宝',
        'search_url': 'https://s.taobao.com/search?q={keyword}',
        'product_url': 'https://item.taobao.com/item.htm?id={id}',
        'comment_url': 'https://rate.taobao.com/feedRateList.htm?auctionNumId={id}&currentPage={page}&pageSize=10'
    }
}

API_URL = 'http://localhost:3000/api/products'

DATABASE_PATH = os.path.join(BASE_DIR, 'data', 'products.db')
LOG_PATH = os.path.join(BASE_DIR, 'logs', 'spider.log')

PROXY_SETTINGS = {
    'enabled': False,
    'http_proxy': 'http://127.0.0.1:7890',
    'https_proxy': 'http://127.0.0.1:7890'
}

SELENIUM_SETTINGS = {
    'enabled': False,
    'headless': True,
    'window_size': (1920, 1080)
}
