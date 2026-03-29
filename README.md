# galaxyex

JavaScript + Yarn 的轻量数字货币交易所原型，支持快速跑通核心业务链路：

- 用户创建
- 资产充值
- 限价下单（买/卖）
- 撮合成交（价格优先 + 时间优先）
- 部分成交
- 撤单与冻结资金释放

## 快速开始

```bash
yarn install
yarn demo
```

`yarn demo` 会直接演示：
1. Alice/Bob 充值；
2. Bob 挂卖单；
3. Alice 挂买单并成交；
4. 查看成交记录、订单簿、余额变化；
5. 二次挂单后撤单。

## 启动 API 服务

```bash
yarn start
```

默认监听 `http://localhost:3000`。

### 核心接口

- `GET /health`
- `POST /users`
  - body: `{ "userId": "alice" }`
- `POST /deposit`
  - body: `{ "userId": "alice", "asset": "USDT", "amount": 100000 }`
- `GET /balances/:userId`
- `POST /orders`
  - body: `{ "userId": "alice", "pair": "BTC/USDT", "side": "buy", "price": 30000, "amount": 0.5 }`
- `POST /orders/cancel`
  - body: `{ "userId": "alice", "orderId": "o_2" }`
- `GET /orderbook?pair=BTC/USDT`
- `GET /trades?pair=BTC/USDT`

## 测试

```bash
yarn test
```

内置用例覆盖：

- 成交与余额变更
- 部分成交 + 撤单释放
- 余额不足下单失败
