const CONSTANTS = {
    PRICE_FIELDS: [
        'price',
        'original_price',
        'current_price',
        'sale_price',
        'min_price',
        'max_price',
        'promotion_price',
        'vip_price',
        'member_price'
    ],
    
    NUMERIC_FIELDS: [
        'sales_count',
        'comment_count',
        'rating',
        'key_count',
        'useful_count',
        'score',
        'page_views',
        'favorites_count',
        'stock'
    ],
    
    INTEGER_FIELDS: [
        'sales_count',
        'comment_count',
        'key_count',
        'useful_count',
        'score',
        'page_views',
        'favorites_count',
        'stock'
    ],
    
    CURRENCY_SYMBOLS: [
        '￥', '¥', '€', '£', '$', '₽', '₹', '฿', '₩', '₫', '₪', '₴',
        '₡', '₢', '₣', '₤', '₥', '₦', '₧', '₨', '₭', '₮', '₯', '₰',
        '₱', '₲', '₳', '₵', '₶', '₷', '₸', '₺', '₻', '₼', '₾', '₿'
    ],
    
    CURRENCY_UNITS: ['元', '块', '美元', '欧元', '英镑', '日元', '韩元'],
    
    INVISIBLE_CHARS_PATTERN: /[\x00-\x08\x0B-\x0C\x0E-\x1F\x7F-\x9F\u200B-\u200D\u202A-\u202E\u2060-\u206F\uFEFF\u0300-\u036F]/g,
    
    FULLWIDTH_NUMBER_PATTERN: /[０-９]/g,
    FULLWIDTH_DOT_PATTERN: /[．。]/g,
    FULLWIDTH_COMMA_PATTERN: /[，]/g,
    
    PRICE_EXTRACT_PATTERN: /-?\d+(?:\.\d+)?/g
};

class DataCleaner {
    constructor(options = {}) {
        this.options = {
            strictMode: options.strictMode || false,
            logErrors: options.logErrors !== false
        };
    }
    
    removeInvisibleChars(text) {
        if (typeof text !== 'string') return text;
        return text.replace(CONSTANTS.INVISIBLE_CHARS_PATTERN, '');
    }
    
    normalizeFullwidthChars(text) {
        if (typeof text !== 'string') return text;
        
        let normalized = text;
        
        normalized = normalized.replace(CONSTANTS.FULLWIDTH_NUMBER_PATTERN, (char) => {
            return String.fromCharCode(char.charCodeAt(0) - 0xFEE0);
        });
        
        normalized = normalized.replace(CONSTANTS.FULLWIDTH_DOT_PATTERN, '.');
        
        normalized = normalized.replace(CONSTANTS.FULLWIDTH_COMMA_PATTERN, ',');
        
        return normalized;
    }
    
    buildCurrencyPattern() {
        const symbols = CONSTANTS.CURRENCY_SYMBOLS.map(s => 
            s === '$' ? '\\$' : s
        ).join('');
        return new RegExp(`[${symbols}]`, 'g');
    }
    
    buildCurrencyUnitPattern() {
        const units = CONSTANTS.CURRENCY_UNITS.map(u => 
            u.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
        ).join('|');
        return new RegExp(units, 'g');
    }
    
    extractPriceValue(text) {
        if (typeof text === 'number') {
            return {
                success: true,
                value: text,
                original: text,
                method: 'already_number'
            };
        }
        
        if (typeof text !== 'string') {
            return {
                success: false,
                value: 0,
                original: text,
                method: 'invalid_type',
                error: 'Input is not a string or number'
            };
        }
        
        let cleaned = text.trim();
        
        cleaned = this.removeInvisibleChars(cleaned);
        
        cleaned = this.normalizeFullwidthChars(cleaned);
        
        const currencyPattern = this.buildCurrencyPattern();
        const currencyUnitPattern = this.buildCurrencyUnitPattern();
        
        cleaned = cleaned.replace(currencyPattern, '');
        
        cleaned = cleaned.replace(currencyUnitPattern, '');
        
        cleaned = cleaned.replace(/[^\d.\-]/g, '');
        
        const matches = cleaned.match(CONSTANTS.PRICE_EXTRACT_PATTERN);
        
        if (matches && matches.length > 0) {
            let priceStr = matches[0];
            
            const dotCount = (priceStr.match(/\./g) || []).length;
            
            if (dotCount > 1) {
                const firstDotIndex = priceStr.indexOf('.');
                if (firstDotIndex !== -1) {
                    priceStr = priceStr.substring(0, firstDotIndex + 1) + 
                               priceStr.substring(firstDotIndex + 1).replace(/\./g, '');
                }
            }
            
            const price = parseFloat(priceStr);
            
            if (!isNaN(price) && isFinite(price)) {
                if (price < 0) {
                    return {
                        success: false,
                        value: 0,
                        original: text,
                        method: 'negative_price',
                        error: 'Negative price is not allowed'
                    };
                }
                
                const decimalPart = priceStr.split('.')[1];
                if (decimalPart && decimalPart.length > 2) {
                    const roundedPrice = Math.round(price * 100) / 100;
                    return {
                        success: true,
                        value: roundedPrice,
                        original: text,
                        method: 'rounded',
                        warning: 'Price was rounded to 2 decimal places'
                    };
                }
                
                return {
                    success: true,
                    value: price,
                    original: text,
                    method: 'extracted'
                };
            }
        }
        
        return {
            success: false,
            value: 0,
            original: text,
            method: 'no_match',
            error: 'No valid price pattern found'
        };
    }
    
    parsePrice(text) {
        const result = this.extractPriceValue(text);
        
        if (result.success) {
            return result.value;
        }
        
        if (this.options.logErrors) {
            console.warn(`[DataCleaner] Price parsing failed: "${text}" - ${result.error}`);
        }
        
        if (this.options.strictMode) {
            return null;
        }
        
        return 0;
    }
    
    filterString(text) {
        if (typeof text !== 'string') return text;
        
        let filtered = text;
        
        filtered = this.removeInvisibleChars(filtered);
        
        filtered = filtered.replace(/[^\u4e00-\u9fa5a-zA-Z0-9\s\.,!?;:()\[\]{}'"\/\\\-_+=@#&*%$~`^<>|]/g, '');
        
        filtered = filtered.replace(/\s+/g, ' ');
        
        filtered = filtered.trim();
        
        return filtered;
    }
    
    parseNumeric(text, isInteger = false) {
        if (typeof text === 'number') {
            return isInteger ? Math.floor(text) : text;
        }
        
        if (typeof text !== 'string') {
            return text;
        }
        
        let cleaned = text.trim();
        cleaned = this.removeInvisibleChars(cleaned);
        cleaned = this.normalizeFullwidthChars(cleaned);
        
        let value;
        if (isInteger) {
            value = parseInt(cleaned, 10);
        } else {
            value = parseFloat(cleaned);
        }
        
        if (isNaN(value) || !isFinite(value)) {
            if (this.options.logErrors) {
                console.warn(`[DataCleaner] Numeric parsing failed: "${text}"`);
            }
            return this.options.strictMode ? null : text;
        }
        
        return value;
    }
    
    cleanProduct(product) {
        const cleaned = {};
        
        for (const [key, value] of Object.entries(product)) {
            const isPriceField = CONSTANTS.PRICE_FIELDS.includes(key);
            const isNumericField = CONSTANTS.NUMERIC_FIELDS.includes(key);
            const isIntegerField = CONSTANTS.INTEGER_FIELDS.includes(key);
            
            if (isPriceField) {
                cleaned[key] = this.parsePrice(value);
            }
            else if (isNumericField) {
                cleaned[key] = this.parseNumeric(value, isIntegerField);
            }
            else if (typeof value === 'string') {
                cleaned[key] = this.filterString(value);
            }
            else if (Array.isArray(value)) {
                cleaned[key] = value.map(item => 
                    typeof item === 'string' ? this.filterString(item) : item
                );
            }
            else if (typeof value === 'object' && value !== null) {
                cleaned[key] = this.cleanProduct(value);
            }
            else {
                cleaned[key] = value;
            }
        }
        
        cleaned.updatedAt = new Date().toISOString();
        
        return cleaned;
    }
    
    cleanComment(comment) {
        const cleaned = {};
        
        for (const [key, value] of Object.entries(comment)) {
            const isNumericField = ['score', 'useful_count'].includes(key);
            
            if (isNumericField) {
                cleaned[key] = this.parseNumeric(value, true);
            }
            else if (typeof value === 'string') {
                cleaned[key] = this.filterString(value);
            }
            else if (Array.isArray(value)) {
                cleaned[key] = value.map(item => 
                    typeof item === 'string' ? this.filterString(item) : item
                );
            }
            else if (typeof value === 'object' && value !== null) {
                cleaned[key] = this.cleanComment(value);
            }
            else {
                cleaned[key] = value;
            }
        }
        
        cleaned.updatedAt = new Date().toISOString();
        
        return cleaned;
    }
    
    static validatePrice(value) {
        if (typeof value !== 'number') return false;
        if (isNaN(value)) return false;
        if (!isFinite(value)) return false;
        if (value < 0) return false;
        return true;
    }
    
    static formatPrice(value, decimals = 2) {
        if (!DataCleaner.validatePrice(value)) {
            return '0.00';
        }
        return value.toFixed(decimals);
    }
}

const defaultCleaner = new DataCleaner();

module.exports = {
    DataCleaner,
    CONSTANTS,
    defaultCleaner,
    
    parsePrice: (text) => defaultCleaner.parsePrice(text),
    filterString: (text) => defaultCleaner.filterString(text),
    parseNumeric: (text, isInteger) => defaultCleaner.parseNumeric(text, isInteger),
    cleanProduct: (product) => defaultCleaner.cleanProduct(product),
    cleanComment: (comment) => defaultCleaner.cleanComment(comment),
    
    validatePrice: DataCleaner.validatePrice,
    formatPrice: DataCleaner.formatPrice
};
