function calculateSimpleRevenue(purchase, _product) {
    if (!purchase
        || !_product
        || typeof purchase.discount !== 'number'
        || typeof purchase.sale_price !== 'number'
        || typeof purchase.quantity !== 'number'
        || purchase.discount < 0
        || purchase.sale_price < 0
        || purchase.quantity < 0) {
        throw new Error("Некорректные входные данные");
    }

    const { discount, sale_price, quantity } = purchase;

    const discountDecimal = 1 - (discount / 100);
    const revenue = sale_price * quantity * discountDecimal;
    return Number(revenue);
}

function calculateBonusByProfit(index, total, seller) {
    const { profit } = seller;

    if (!seller
        || typeof seller.profit !== 'number'
        || typeof index !== 'number'
        || typeof total !== 'number'
        || index < 0
        || total <= 0
        || index >= total
        || profit < 0) {
        throw new Error("Некорректные входные данные");
    }

    if (index === 0) {
        return Number(profit * 0.15);
    } else if (index === 1 || index === 2) {
        return Number(profit * 0.10);
    } else if (index === total - 1) {
        return 0;
    } else {
        return Number(profit * 0.05);
    }
}

function analyzeSalesData(data, options) {
    if (!data
        || !data.customers
        || !data.products
        || !data.sellers
        || !data.purchase_records
        || !Array.isArray(data.customers)
        || !Array.isArray(data.products)
        || !Array.isArray(data.sellers)
        || !Array.isArray(data.purchase_records)
        || data.customers.length === 0
        || data.products.length === 0
        || data.sellers.length === 0
        || data.purchase_records.length === 0) {
        throw new Error("Некорректные входные данные");
    }

    if (typeof options !== "object" || options === null
        || !options.calculateRevenue
        || !options.calculateBonus
        || typeof options.calculateRevenue !== "function"
        || typeof options.calculateBonus !== "function") {
        throw new Error("Чего-то не хватает");
    }
    const { calculateRevenue, calculateBonus } = options;

    const productIndex = Object.fromEntries(data.products.map(p => [p.sku, p]));

    const sellerStats = data.sellers.map(seller => ({
        id: seller.id,
        name: `${seller.first_name} ${seller.last_name}`,
        revenue: 0,
        profit: 0,
        sales_count: 0,
        products_sold: {},
        top_products: [],
        bonus: 0
    }));

    const sellerIndex = Object.fromEntries(sellerStats.map(s => [s.id, s]));

    data.purchase_records.forEach(record => {
        const seller = sellerIndex[record.seller_id];
        if (seller) {
            seller.sales_count += 1;
            seller.revenue += record.total_amount;
            record.items.forEach(item => {
                const product = productIndex[item.sku];
                if (product) {
                    const cost = product.purchase_price * item.quantity;
                    const revenue = calculateRevenue(item, product);
                    const profit = revenue - cost;
                    seller.profit += profit;
                    if (!seller.products_sold[item.sku]) {
                        seller.products_sold[item.sku] = 0;
                    }
                    seller.products_sold[item.sku] += item.quantity;
                }
            });
        }
    });

    sellerStats.sort((a, b) => b.profit - a.profit);

    sellerStats.forEach((seller, index) => {
        seller.bonus = calculateBonus(index, sellerStats.length, seller);
        seller.top_products = Object.entries(seller.products_sold)
            .map(([sku, quantity]) => ({ sku, quantity }))
            .sort((a, b) => b.quantity - a.quantity)
            .slice(0, 10);
    });

    return sellerStats.map(seller => ({
        seller_id: String(seller.id),
        name: seller.name,
        revenue: +seller.revenue.toFixed(2),
        profit: +seller.profit.toFixed(2),
        sales_count: seller.sales_count,
        top_products: seller.top_products,
        bonus: +seller.bonus.toFixed(2)
    }));
}