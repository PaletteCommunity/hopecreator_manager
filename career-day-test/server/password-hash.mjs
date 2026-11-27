import { makePasswordHash } from './api.mjs';

// Password input stays out of shell arguments, history and files.
process.stderr.write('관리자 비밀번호 (12자 이상): ');
let password = '';
if (process.stdin.isTTY) {
  process.stdin.setRawMode(true); process.stdin.setEncoding('utf8'); process.stdin.resume();
  password = await new Promise(resolve => {
    const onData = chunk => {
      for (const char of chunk) {
        if (char === '\u0003') process.exit(130);
        if (char === '\r' || char === '\n') { process.stdin.off('data', onData); process.stdin.setRawMode(false); process.stdin.pause(); process.stderr.write('\n'); resolve(password); return; }
        if (char === '\u007f' || char === '\b') password = Array.from(password).slice(0, -1).join('');
        else if (password.length < 256) password += char;
      }
    };
    process.stdin.on('data', onData);
  });
} else {
  for await (const chunk of process.stdin) { password += chunk; if (password.length > 1024) throw Error('입력이 너무 깁니다.'); }
  password = password.replace(/\r?\n$/, '');
}
try { process.stdout.write(`${await makePasswordHash(password)}\n`); }
catch (error) { process.stderr.write(`${error.message}\n`); process.exitCode = 1; }
