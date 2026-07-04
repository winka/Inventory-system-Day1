const express = require('express');
const app = express();
const PORT = 3000;

// 啟用 JSON 解析功能，這樣程式才能讀懂前端傳來的新麵粉資料
app.use(express.json());

// 我們的模擬麵粉倉庫 (記憶體資料庫)
let inventory = [
    { id: 1, name: '特級高筋麵粉', quantity: 50, unit: '袋' },
    { id: 2, name: '中筋麵粉', quantity: 30, unit: '袋' }
];

// ==========================================
// 1. [GET] 取得所有麵粉庫存
// ==========================================
app.get('/api/inventory', (req, res) => {
    res.status(200).json({
        message: '成功取得庫存清單',
        data: inventory
    });
});

// ==========================================
// 2. [POST] 新增一筆麵粉資料
// ==========================================
app.post('/api/inventory', (req, res) => {
    const itemData = req.body; // 接收前端傳來的資料
    
    // 展開運算子：複製一份新資料，避免動到源頭
    const newItem = { ...itemData };
    
    // 三元運算子：自動計算下一個不重複的 ID
    newItem.id = inventory.length ? inventory[inventory.length - 1].id + 1 : 1;
    
    // 用 .push() 塞入倉庫最尾端
    inventory.push(newItem);

    res.status(201).json({
        message: '成功新增庫存項目',
        data: newItem
    });
});

// ==========================================
// 3. [PUT] 修改指定 ID 的麵粉資料
// ==========================================
app.put('/api/inventory/:id', (req, res) => {
    const itemId = parseInt(req.params.id); // 取得網址上的 ID 數字
    const updatedData = req.body;           // 取得要修改的內容

    // 用 .findIndex() 找這包麵粉在倉庫的第幾個位置
    const index = inventory.findIndex(item => item.id === itemId);

    if (index !== -1) {
        // 找到的話，用展開運算子合併新舊資料，並鎖死 ID
        inventory[index] = { ...inventory[index], ...updatedData, id: itemId };
        res.status(200).json({
            message: `成功更新 ID ${itemId} 的資料`,
            data: inventory[index]
        });
    } else {
        res.status(404).json({ message: '找不到該庫存項目' });
    }
});

// ==========================================
// 4. [DELETE] 刪除指定 ID 的麵粉
// ==========================================
app.delete('/api/inventory/:id', (req, res) => {
    const itemId = parseInt(req.params.id);
    const initialLength = inventory.length; // 記下原本的長度
    
    // 用 .filter() 留下「不是這個 ID」的麵粉，重新指派給變數
    inventory = inventory.filter(item => item.id !== itemId);

    // 比對長度，確認有沒有刪除成功
    if (inventory.length < initialLength) {
        res.status(200).json({ message: `成功刪除 ID ${itemId} 的項目` });
    } else {
        res.status(404).json({ message: '找不到該庫存項目' });
    }
});

// 啟動伺服器並監聽 3000 連線埠
app.listen(PORT, () => {
    console.log(`伺服器已啟動！請打開 http://localhost:${PORT}/api/inventory`);
});