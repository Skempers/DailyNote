function folderUrl(raw: string): string {
  const trimmed = raw.trim();
  const u = new URL(trimmed);
  if (u.protocol !== "https:" && u.protocol !== "http:") {
    throw new Error("网盘地址必须是 http 或 https");
  }
  if (u.username || u.password) {
    throw new Error("账号密码请填在下面两栏，不要写进地址里");
  }
  const path = u.pathname.endsWith("/") ? u.pathname : `${u.pathname}/`;
  return `${u.origin}${path}${u.search}`;
}

function authHeader(user: string, pass: string) {
  return `Basic ${Buffer.from(`${user}:${pass}`, "utf8").toString("base64")}`;
}

async function mkcol(base: string, auth: string) {
  const res = await fetch(base, {
    method: "MKCOL",
    headers: { Authorization: auth },
  });
  if (res.ok || res.status === 201 || res.status === 405 || res.status === 409) return;
}

export function normalizeWebdavFolder(raw: string): string {
  return folderUrl(raw);
}

export async function putWebdavFile(opts: {
  folder: string;
  username: string;
  password: string;
  filename: string;
  body: string;
  contentType?: string;
}): Promise<void> {
  const folder = folderUrl(opts.folder);
  if (!opts.username.trim()) throw new Error("请填写网盘用户名");
  if (!opts.password) throw new Error("请填写网盘密码或应用专用密码");
  const auth = authHeader(opts.username.trim(), opts.password);
  const target = new URL(opts.filename, folder).toString();
  const headers = {
    Authorization: auth,
    "Content-Type": opts.contentType ?? "application/json; charset=utf-8",
  };
  let res = await fetch(target, { method: "PUT", headers, body: opts.body });
  if (res.status === 404 || res.status === 409) {
    await mkcol(folder, auth);
    res = await fetch(target, { method: "PUT", headers, body: opts.body });
  }
  if (res.status === 201 || res.status === 204 || res.status === 200) return;
  const detail = (await res.text().catch(() => "")).slice(0, 180);
  throw new Error(detail ? `网盘返回 ${res.status}：${detail}` : `网盘返回 ${res.status}`);
}
