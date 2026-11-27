// 数据库连接池：使用 mysql2/promise 提供统一查询入口，连接失败不中断主流程
const mysql = require('mysql2/promise');

const twj_pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  port: Number(process.env.DB_PORT) || 3306,
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'twj_llm_project',
  waitForConnections: true,
  connectionLimit: 5,
  charset: 'utf8mb4'
});

// 执行 SQL 查询，返回结果数组；出错时抛出带提示的异常
async function twj_query(twj_sql, twj_params) {
  const [twj_rows] = await twj_pool.query(twj_sql, twj_params);
  return twj_rows;
}

module.exports = { twj_query, twj_pool };
