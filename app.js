// 1. 載入並讀取 .env 檔案裡的機密環境變數
require('dotenv').config();

const express = require('express');
const app = express();
const PORT = 3000;

// 2. 載入 pg 套件中的 Pool (連線池)
const { Pool } = require('pg');

// 3. 建立資料庫連線池
const pool = new Pool({
    connectionString: process.env.DATABASE_URL, // 自動去抓 .env 裡的密碼
    ssl: {
        rejectUnauthorized: false // 允許連線到雲端資料庫的安全設定
    }
});

app.use(express.json());

// ==========================================
// 1. [GET] 取得所有麵粉庫存
// ==========================================
app.get('/api/inventory', async (req, res) => {
    try {
        // 派警衛 (pool) 去資料庫執行 SQL 查詢指令，並等待 (await) 結果回來
        // ORDER BY id ASC 代表按照 ID 由小到大排序
        const result = await pool.query('SELECT * FROM inventory ORDER BY id ASC');
        
        // 將拿到的資料打包回傳給前端
        res.status(200).json({
            message: '成功從 PostgreSQL 取得庫存清單！',
            data: result.rows  // 🔑 關鍵：資料庫查到的陣列，會放在 result 的 rows 屬性裡
        });

    } catch (error) {
        // 如果資料庫當機或 SQL 語法寫錯，就會跑到這裡
        console.error('查詢資料庫失敗：', error);
        res.status(500).json({ message: '伺服器內部發生錯誤' });
    }
});
// ==========================================
// 2. [POST] 新增一筆麵粉資料
// ==========================================
app.post('/api/inventory', async (req, res) => {
    try {
        // 1. 打開包裹，拿出裡面的麵粉資訊
        const { name, quantity, unit } = req.body;

        // 2. 準備 SQL 新增語法 (注意 VALUES 裡面的 $1, $2, $3)
        const insertQuery = `
            INSERT INTO inventory (name, quantity, unit) 
            VALUES ($1, $2, $3) 
            RETURNING *;
        `;
        
        // 3. 把實際要填入的資料打包成陣列
        const values = [name, quantity, unit];

        // 4. 派警衛把「語法」和「資料」分開帶去資料庫執行
        const result = await pool.query(insertQuery, values);

        // 5. 回傳成功訊息，並把資料庫剛剛建好的那筆資料印出來
        res.status(201).json({
            message: '成功將新麵粉存入資料庫！',
            data: result.rows[0] 
        });

    } catch (error) {
        console.error('新增資料失敗：', error);
        res.status(500).json({ message: '伺服器內部發生錯誤' });
    }
});

// ==========================================
// 3. [PUT] 修改指定 ID 的麵粉資料
// ==========================================
app.put('/api/inventory/:id', async (req, res) => {
    try {
        const itemId = parseInt(req.params.id);
        const { quantity } = req.body;

        // 🔑 關鍵：使用 WHERE id = $2 鎖定目標，避免全表更新
        const updateQuery = `
            UPDATE inventory 
            SET quantity = $1 
            WHERE id = $2 
            RETURNING *;
        `;

        const result = await pool.query(updateQuery, [quantity, itemId]);

        // 如果資料庫回傳的 rows 長度為 0，代表找不到這個 ID
        if (result.rows.length === 0) {
            return res.status(404).json({ message: '倉庫中找不到該 ID 的麵粉' });
        }

        res.status(200).json({
            message: '成功修改資料庫庫存！',
            data: result.rows[0] // 把更新後的完整資料交給前端
        });

    } catch (error) {
        console.error('更新資料失敗：', error);
        res.status(500).json({ message: '伺服器內部發生錯誤' });
    }
});

// ==========================================
// 4. [DELETE] 刪除特定麵粉資料 (Day 2 真實資料庫版)
// ==========================================
app.delete('/api/inventory/:id', async (req, res) => {
    try {
        const itemId = parseInt(req.params.id);

        // 🔑 關鍵：使用 WHERE id = $1 鎖定目標，否則會清空整張表！
        const deleteQuery = 'DELETE FROM inventory WHERE id = $1 RETURNING *;';
        const result = await pool.query(deleteQuery, [itemId]);

        if (result.rows.length === 0) {
            return res.status(404).json({ message: '找不到該項目，無法刪除' });
        }

        res.status(200).json({ 
            message: `成功從資料庫刪除 ID ${itemId} 的麵粉項目` 
        });

    } catch (error) {
        console.error('刪除資料失敗：', error);
        res.status(500).json({ message: '伺服器內部發生錯誤' });
    }
});

// 啟動伺服器並監聽 3000 連線埠
app.listen(PORT, () => {
    console.log(`伺服器已啟動！請打開 http://localhost:${PORT}/api/inventory`);
});

// 啟動伺服器並測試資料庫連線
app.listen(PORT, async () => {
    console.log(`伺服器已啟動！請打開 http://localhost:${PORT}`);
    
    try {
        // 去資料庫執行一個最簡單的 SQL 指令：SELECT NOW() (取得現在時間)
        const res = await pool.query('SELECT NOW()');
        console.log('✅ 資料庫連線成功！資料庫時間：', res.rows[0].now);
    } catch (error) {
        console.error('❌ 資料庫連線失敗：', error.message);
    }
});