import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Product from './models/Product.js';

dotenv.config();

const seedProducts = [
    {
        title: 'Sony PlayStation 5 Digital Edition White',
        model: 'PS5',
        price: 450,
        condition: 'Як новий',
        rating: 5,
        description: 'Ідеальний стан, повний комплект. Не шумить, не гріється. Використовувалася дбайливо.',
        imageUrl: 'https://bigmag.ua/image/cache/catalog/image/Product/Sony%20Playstation%205/PS5/1/4-2000x2000.png',
        status: 'available'
    },
    {
        title: 'Sony PlayStation 4 Pro 1TB Black',
        model: 'PS4 Pro',
        price: 299,
        condition: 'Як новий',
        rating: 4.8,
        description: 'Відмінна консоль для 4K геймінгу. Замінена термопаста, працює тихо.',
        imageUrl: 'https://content.rozetka.com.ua/goods/images/big/559177491.jpg',
        status: 'available'
    },
    {
        title: 'Sony PlayStation 4 Slim 500GB',
        model: 'PS4',
        price: 199,
        condition: 'В гарному стані',
        rating: 3.5,
        description: 'Гарний стан. Є дрібні подряпини на корпусі, але технічно все ідеально.',
        imageUrl: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcTkhx3tU0tcnAdvUuth93xruayvXuatdwJZsQ&s',
        status: 'available'
    },
    {
        title: 'Sony PlayStation 3 SuperSlim 500GB',
        model: 'PS3',
        price: 99,
        condition: 'Можливі подряпини',
        rating: 0,
        description: 'Легендарна класика. Корпус потертий, геймпад не оригінальний, але диски читає без проблем.',
        imageUrl: 'https://favoritegame.com.ua/content/images/14/480x480l50nn0/19219225142332.jpg',
        status: 'available'
    },
    {
        title: 'Sony PlayStation 5 Digital Edition White',
        model: 'PS5',
        price: 450,
        condition: 'Як новий',
        rating: 5,
        description: 'Ідеальний стан, повний комплект. Не шумить, не гріється. Використовувалася дбайливо.',
        imageUrl: 'https://bigmag.ua/image/cache/catalog/image/Product/Sony%20Playstation%205/PS5/1/4-2000x2000.png',
        status: 'available'
    },
    {
        title: 'Sony PlayStation 4 Pro 1TB Black',
        model: 'PS4 Pro',
        price: 299,
        condition: 'Як новий',
        rating: 4.8,
        description: 'Відмінна консоль для 4K геймінгу. Замінена термопаста, працює тихо.',
        imageUrl: 'https://content.rozetka.com.ua/goods/images/big/559177491.jpg',
        status: 'available'
    },
    {
        title: 'Sony PlayStation 4 Slim 500GB',
        model: 'PS4',
        price: 199,
        condition: 'В гарному стані',
        rating: 3.5,
        description: 'Гарний стан. Є дрібні подряпини на корпусі, але технічно все ідеально.',
        imageUrl: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcTkhx3tU0tcnAdvUuth93xruayvXuatdwJZsQ&s',
        status: 'available'
    },
    {
        title: 'Sony PlayStation 3 SuperSlim 500GB',
        model: 'PS3',
        price: 99,
        condition: 'Можливі подряпини',
        rating: 0,
        description: 'Легендарна класика. Корпус потертий, геймпад не оригінальний, але диски читає без проблем.',
        imageUrl: 'https://favoritegame.com.ua/content/images/14/480x480l50nn0/19219225142332.jpg',
        status: 'available'
    },
    {
        title: 'Sony PlayStation 5 Digital Edition White',
        model: 'PS5',
        price: 450,
        condition: 'Як новий',
        rating: 5,
        description: 'Ідеальний стан, повний комплект. Не шумить, не гріється. Використовувалася дбайливо.',
        imageUrl: 'https://bigmag.ua/image/cache/catalog/image/Product/Sony%20Playstation%205/PS5/1/4-2000x2000.png',
        status: 'available'
    },
    {
        title: 'Sony PlayStation 4 Pro 1TB Black',
        model: 'PS4 Pro',
        price: 299,
        condition: 'Як новий',
        rating: 4.8,
        description: 'Відмінна консоль для 4K геймінгу. Замінена термопаста, працює тихо.',
        imageUrl: 'https://content.rozetka.com.ua/goods/images/big/559177491.jpg',
        status: 'available'
    },
    {
        title: 'Sony PlayStation 4 Slim 500GB',
        model: 'PS4',
        price: 199,
        condition: 'В гарному стані',
        rating: 3.5,
        description: 'Гарний стан. Є дрібні подряпини на корпусі, але технічно все ідеально.',
        imageUrl: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcTkhx3tU0tcnAdvUuth93xruayvXuatdwJZsQ&s',
        status: 'available'
    },
    {
        title: 'Sony PlayStation 3 SuperSlim 500GB',
        model: 'PS3',
        price: 99,
        condition: 'Можливі подряпини',
        rating: 0,
        description: 'Легендарна класика. Корпус потертий, геймпад не оригінальний, але диски читає без проблем.',
        imageUrl: 'https://favoritegame.com.ua/content/images/14/480x480l50nn0/19219225142332.jpg',
        status: 'available'
    },
    {
        title: 'Sony PlayStation 5 Digital Edition White',
        model: 'PS5',
        price: 450,
        condition: 'Як новий',
        rating: 5,
        description: 'Ідеальний стан, повний комплект. Не шумить, не гріється. Використовувалася дбайливо.',
        imageUrl: 'https://bigmag.ua/image/cache/catalog/image/Product/Sony%20Playstation%205/PS5/1/4-2000x2000.png',
        status: 'available'
    },
    {
        title: 'Sony PlayStation 4 Pro 1TB Black',
        model: 'PS4 Pro',
        price: 299,
        condition: 'Як новий',
        rating: 4.8,
        description: 'Відмінна консоль для 4K геймінгу. Замінена термопаста, працює тихо.',
        imageUrl: 'https://content.rozetka.com.ua/goods/images/big/559177491.jpg',
        status: 'available'
    },
    {
        title: 'Sony PlayStation 4 Slim 500GB',
        model: 'PS4',
        price: 199,
        condition: 'В гарному стані',
        rating: 3.5,
        description: 'Гарний стан. Є дрібні подряпини на корпусі, але технічно все ідеально.',
        imageUrl: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcTkhx3tU0tcnAdvUuth93xruayvXuatdwJZsQ&s',
        status: 'available'
    },
    {
        title: 'Sony PlayStation 3 SuperSlim 500GB',
        model: 'PS3',
        price: 99,
        condition: 'Можливі подряпини',
        rating: 0,
        description: 'Легендарна класика. Корпус потертий, геймпад не оригінальний, але диски читає без проблем.',
        imageUrl: 'https://favoritegame.com.ua/content/images/14/480x480l50nn0/19219225142332.jpg',
        status: 'available'
    },
    {
        title: 'Sony PlayStation 5 Digital Edition White',
        model: 'PS5',
        price: 450,
        condition: 'Як новий',
        rating: 5,
        description: 'Ідеальний стан, повний комплект. Не шумить, не гріється. Використовувалася дбайливо.',
        imageUrl: 'https://bigmag.ua/image/cache/catalog/image/Product/Sony%20Playstation%205/PS5/1/4-2000x2000.png',
        status: 'available'
    },
    {
        title: 'Sony PlayStation 4 Pro 1TB Black',
        model: 'PS4 Pro',
        price: 299,
        condition: 'Як новий',
        rating: 4.8,
        description: 'Відмінна консоль для 4K геймінгу. Замінена термопаста, працює тихо.',
        imageUrl: 'https://content.rozetka.com.ua/goods/images/big/559177491.jpg',
        status: 'available'
    },
    {
        title: 'Sony PlayStation 4 Slim 500GB',
        model: 'PS4',
        price: 199,
        condition: 'В гарному стані',
        rating: 3.5,
        description: 'Гарний стан. Є дрібні подряпини на корпусі, але технічно все ідеально.',
        imageUrl: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcTkhx3tU0tcnAdvUuth93xruayvXuatdwJZsQ&s',
        status: 'available'
    },
    {
        title: 'Sony PlayStation 3 SuperSlim 500GB',
        model: 'PS3',
        price: 99,
        condition: 'Можливі подряпини',
        rating: 0,
        description: 'Легендарна класика. Корпус потертий, геймпад не оригінальний, але диски читає без проблем.',
        imageUrl: 'https://favoritegame.com.ua/content/images/14/480x480l50nn0/19219225142332.jpg',
        status: 'available'
    },
    {
        title: 'Sony PlayStation 5 Digital Edition White',
        model: 'PS5',
        price: 450,
        condition: 'Як новий',
        rating: 5,
        description: 'Ідеальний стан, повний комплект. Не шумить, не гріється. Використовувалася дбайливо.',
        imageUrl: 'https://bigmag.ua/image/cache/catalog/image/Product/Sony%20Playstation%205/PS5/1/4-2000x2000.png',
        status: 'available'
    },
    {
        title: 'Sony PlayStation 4 Pro 1TB Black',
        model: 'PS4 Pro',
        price: 299,
        condition: 'Як новий',
        rating: 4.8,
        description: 'Відмінна консоль для 4K геймінгу. Замінена термопаста, працює тихо.',
        imageUrl: 'https://content.rozetka.com.ua/goods/images/big/559177491.jpg',
        status: 'available'
    },
    {
        title: 'Sony PlayStation 4 Slim 500GB',
        model: 'PS4',
        price: 199,
        condition: 'В гарному стані',
        rating: 3.5,
        description: 'Гарний стан. Є дрібні подряпини на корпусі, але технічно все ідеально.',
        imageUrl: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcTkhx3tU0tcnAdvUuth93xruayvXuatdwJZsQ&s',
        status: 'available'
    },
    {
        title: 'Sony PlayStation 3 SuperSlim 500GB',
        model: 'PS3',
        price: 99,
        condition: 'Можливі подряпини',
        rating: 0,
        description: 'Легендарна класика. Корпус потертий, геймпад не оригінальний, але диски читає без проблем.',
        imageUrl: 'https://favoritegame.com.ua/content/images/14/480x480l50nn0/19219225142332.jpg',
        status: 'available'
    }
];

const seedDatabase = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('База данных подключена для сидирования...');
        await Product.deleteMany();
        console.log('Старые товары успешно удалены.');
        await Product.insertMany(seedProducts);
        console.log('База данных успешно заполнена новыми консолями!');
        mongoose.connection.close();
        process.exit();
    } catch (error) {
        console.error('Ошибка при сидировании базы данных:', error);
        mongoose.connection.close();
        process.exit(1);
    }
};

seedDatabase();