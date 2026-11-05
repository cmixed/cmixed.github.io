/**
 * VS Code「Vitest」扩展在 WSL 下的 localhost 回环补丁。
 *
 * 扩展在工作区进程里 `createServer().listen(0)` 起 WebSocket 服务，不带 host
 * 时 Node 只绑 IPv6 的 `::`；随后它让 worker 连 `ws://localhost:PORT`。
 * 但 WSL 生成的 /etc/hosts 通常只有 `127.0.0.1 localhost`（`::1` 绑在
 * `ip6-localhost`），于是 localhost 只解析到 127.0.0.1，连不上只监听 `::`
 * 的服务 —— 报 `ECONNREFUSED 127.0.0.1:PORT`，worker 退出码 1，扩展显示
 * 「could not load any config」。
 *
 * 这里只对 `localhost` 的解析结果补一条 `::1`。Node 20+ 的 Happy Eyeballs
 * 会在 IPv4 失败后自动重试 IPv6（反之亦然），连接就能落到真正的监听地址上。
 * 不碰 /etc/hosts（WSL 每次启动会重写，且需要 sudo），也不改系统设置；
 * 只作用于用 `--import` 预载它的这个 Node 进程及其后续调用。
 *
 * 显式要求 IPv4 / IPv6（family 4 / 6）时原样放行，不改调用者的语义。
 */
import dns from 'node:dns';

const originalLookup = dns.lookup;
const originalPromiseLookup = dns.promises.lookup;

function familyOf(options) {
  return options && typeof options === 'object' ? options.family : options;
}

function wantsPatch(hostname, options) {
  if (hostname !== 'localhost') return false;
  const family = familyOf(options);
  return family !== 4 && family !== 'IPv4' && family !== 6 && family !== 'IPv6';
}

function addLoopback(addresses) {
  if (addresses.some((entry) => entry.address === '::1')) return addresses;
  return [...addresses, { address: '::1', family: 6 }];
}

dns.lookup = function lookup(hostname, options, callback) {
  if (typeof options === 'function') {
    callback = options;
    options = {};
  }
  if (!wantsPatch(hostname, options)) {
    return originalLookup.call(this, hostname, options, callback);
  }

  const wantsAll = Boolean(options && typeof options === 'object' && options.all);
  const base = options && typeof options === 'object' ? options : {};
  originalLookup.call(this, hostname, { ...base, all: true }, (error, addresses) => {
    if (error) return callback(error);
    const list = addLoopback(addresses);
    if (wantsAll) return callback(null, list);
    return callback(null, list[0].address, list[0].family);
  });
};

dns.promises.lookup = async function lookup(hostname, options) {
  if (!wantsPatch(hostname, options)) {
    return originalPromiseLookup.call(this, hostname, options);
  }

  const wantsAll = Boolean(options && typeof options === 'object' && options.all);
  const base = options && typeof options === 'object' ? options : {};
  const list = addLoopback(
    await originalPromiseLookup.call(this, hostname, { ...base, all: true })
  );
  if (wantsAll) return list;
  return { address: list[0].address, family: list[0].family };
};
