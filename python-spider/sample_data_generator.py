import random
import json
import time
from datetime import datetime, timedelta
import requests

def generate_keyboard_products(count=50):
    brands = ['雷蛇', '罗技', '樱桃', '斐尔可', '阿米洛', '利奥博德', 'HHKB', '达尔优', '雷柏', '腹灵', 'AKKO', 'Keychron', 'RK', '黑峡谷']
    models = ['BlackWidow', 'G Pro X', 'MX-Board', 'Majestouch', 'Varmilo', 'FC980M', 'Type-S', 'EK925', 'V700', 'FL980', '3068B', 'K2', 'RK98', 'X3']
    axis_types = ['红轴', '青轴', '茶轴', '黑轴', '银轴', '黄轴', '静音红轴', 'BOX轴', 'TTC金粉轴', '佳达隆G银轴']
    key_counts = [61, 68, 75, 84, 87, 96, 98, 104, 108]
    platforms = ['京东', '天猫', '淘宝']
    shops = ['雷蛇官方旗舰店', '罗技官方旗舰店', '樱桃旗舰店', '阿米洛旗舰店', '京东自营']
    
    products = []
    
    for i in range(count):
        brand = random.choice(brands)
        model = random.choice(models)
        price = round(random.uniform(99, 1999), 2)
        original_price = round(price * random.uniform(1.1, 1.5), 2)
        
        product = {
            'id': f'product_{int(time.time())}_{i}',
            'platform': random.choice(platforms),
            'name': f'{brand} {model} 机械键盘',
            'price': price,
            'original_price': original_price,
            'shop': random.choice(shops),
            'image_url': f'https://picsum.photos/seed/{i}/400/400',
            'product_url': f'https://item.example.com/item/{i}',
            'category': '键盘',
            'fetch_time': datetime.now().isoformat(),
            'brand': brand,
            'model': model,
            'axis_type': random.choice(axis_types),
            'key_count': random.choice(key_counts),
            'description': f'{brand} {model} 机械键盘，采用高品质轴体，手感舒适，适合游戏和办公使用。',
            'sales_count': random.randint(100, 10000),
            'rating': round(random.uniform(3.5, 5.0), 1),
            'comment_count': random.randint(10, 5000)
        }
        
        products.append(product)
    
    return products

def generate_price_history(products, days=30):
    price_history = []
    
    for product in products:
        base_price = product['price']
        
        for day in range(days):
            date = (datetime.now() - timedelta(days=day)).strftime('%Y-%m-%d')
            price_variation = base_price * random.uniform(0.9, 1.1)
            price = round(price_variation, 2)
            
            history_entry = {
                'id': f'history_{product["id"]}_{date}',
                'product_id': product['id'],
                'date': date,
                'price': price,
                'original_price': round(price * random.uniform(1.1, 1.5), 2),
                'platform': product['platform']
            }
            
            price_history.append(history_entry)
    
    return price_history

def generate_comments(products, count_per_product=10):
    comments = []
    comment_contents = [
        '手感很好，手感非常舒适，打字很爽！',
        '这个键盘的手感真的很棒，推荐购买！',
        '外观很漂亮，做工也不错，值得购买。',
        '性价比很高，使用体验不错。',
        '轴体手感很好，声音也不错，推荐！',
        '按键手感舒适，外观设计精美，非常满意！',
        '发货速度很快，包装也很好，键盘用起来很舒服。',
        '这个价格能买到这样的键盘，真的很超值！',
        '使用了几天，手感很好，没有发现什么问题。',
        '键盘质量很好，手感舒适，推荐给大家！'
    ]
    
    user_names = ['键盘爱好者', '游戏玩家', '办公达人', '程序员小明', '设计狮', '产品经理', '机械键盘控', '电竞选手']
    
    for product in products:
        for i in range(count_per_product):
            comment = {
                'id': f'comment_{product["id"]}_{i}',
                'product_id': product['id'],
                'content': random.choice(comment_contents),
                'score': random.randint(3, 5),
                'user_name': random.choice(user_names),
                'user_level': random.choice(['VIP1', 'VIP2', 'VIP3', '普通用户']),
                'time': (datetime.now() - timedelta(days=random.randint(0, 30))).isoformat(),
                'images': [f'https://picsum.photos/seed/{i}_{j}/300/300' for j in range(random.randint(0, 3))] if random.random() > 0.5 else [],
                'useful_count': random.randint(0, 100),
                'fetch_time': datetime.now().isoformat()
            }
            
            comments.append(comment)
    
    return comments

def send_to_api(data, endpoint, api_url='http://localhost:3000/api'):
    try:
        response = requests.post(
            f'{api_url}/{endpoint}',
            json=data,
            headers={'Content-Type': 'application/json'},
            timeout=30
        )
        response.raise_for_status()
        return response.json()
    except Exception as e:
        print(f"发送数据到 API 失败: {e}")
        return None

def main():
    print("=" * 50)
    print("键盘商品示例数据生成器")
    print("=" * 50)
    
    print("\n正在生成商品数据...")
    products = generate_keyboard_products(50)
    print(f"生成了 {len(products)} 个商品")
    
    print("\n正在生成价格历史数据...")
    price_history = generate_price_history(products, 30)
    print(f"生成了 {len(price_history)} 条价格历史记录")
    
    print("\n正在生成评论数据...")
    comments = generate_comments(products, 10)
    print(f"生成了 {len(comments)} 条评论")
    
    print("\n" + "=" * 50)
    print("数据生成完成！")
    print(f"商品数量: {len(products)}")
    print(f"价格历史数量: {len(price_history)}")
    print(f"评论数量: {len(comments)}")
    print("=" * 50)
    
    print("\n尝试发送数据到 API...")
    
    products_result = send_to_api({'products': products}, 'products')
    if products_result:
        print(f"商品数据发送成功: {products_result}")
    
    history_result = send_to_api({'price_history': price_history}, 'price-history')
    if history_result:
        print(f"价格历史数据发送成功: {history_result}")
    
    comments_result = send_to_api({'comments': comments}, 'comments')
    if comments_result:
        print(f"评论数据发送成功: {comments_result}")
    
    return {
        'products': products,
        'price_history': price_history,
        'comments': comments
    }

if __name__ == '__main__':
    main()
