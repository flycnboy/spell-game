declare const process: { exitCode?: number };

import { reviewInterval, scheduleNextReview } from '../src/lib/review';
import { computeTodayPlan } from '../src/lib/plan';
import {
  collectLocal, applyLocal, mergeStats, mergeEnriched,
  type CloudStorage, type CloudBackup,
} from '../src/lib/cloudMerge';
import { encryptString, decryptString } from '../src/lib/crypto';

// ---- 极简测试框架 ----
let pass = 0;
let fail = 0;
const failures: string[] = [];
function assert(cond: boolean, msg: string) {
  if (cond) { pass++; }
  else { fail++; failures.push(msg); console.log('  ✗ ' + msg); }
}
function eq(actual: unknown, expected: unknown, msg: string) {
  assert(JSON.stringify(actual) === JSON.stringify(expected), `${msg} (期望 ${JSON.stringify(expected)}，实际 ${JSON.stringify(actual)})`);
}
function section(name: string) { console.log('\n# ' + name); }

// ---- Mock 存储（实现 CloudStorage）----
class MockStorage implements CloudStorage {
  private m = new Map<string, string>();
  get length() { return this.m.size; }
  getItem(k: string) { return this.m.has(k) ? this.m.get(k)! : null; }
  setItem(k: string, v: string) { this.m.set(k, v); }
  removeItem(k: string) { this.m.delete(k); }
  key(i: number) { return Array.from(this.m.keys())[i] ?? null; }
  snapshot() { return Object.fromEntries(this.m); }
}

async function main() {

// ============ 1. reviewInterval ============
section('reviewInterval 边界');
eq(reviewInterval(0), 30, '0 错 → 30 天');
eq(reviewInterval(1), 15, '1 错 → 15 天');
eq(reviewInterval(2), 7, '2 错 → 7 天');
eq(reviewInterval(3), 3, '3 错 → 3 天');
eq(reviewInterval(4), 1, '≥4 错 → 每日');
eq(reviewInterval(10), 1, '极大错误数 → 每日');
eq(reviewInterval(-2), 30, '负数按已掌握');

// ============ 2. scheduleNextReview ============
section('scheduleNextReview');
eq(scheduleNextReview(5, 0), 35, '第5天且0错 → 第35天');
eq(scheduleNextReview(5, 2), 12, '第5天且2错 → 第12天');
eq(scheduleNextReview(31, 0), 61, '第31天且0错 → 第61天');

// ============ 3. computeTodayPlan 到期逻辑 ============
section('computeTodayPlan 到期逻辑');
const words100 = Array.from({ length: 100 }, (_, i) => `w${i}`);
// 第31天、每日10词、无错误无排程
let plan = computeTodayPlan(words100, 31, 10, {}, {});
eq(plan.newWords.length, 0, '第31天无新词（已学完100）');
assert(plan.reviewWords.includes('w0'), '第1天学的 w0 在第31天到期(1+30)');
assert(plan.reviewWords.includes('w9'), '第1天学的 w9 在第31天到期');
assert(!plan.reviewWords.includes('w10'), '第2天学的 w10 在第31天未到期(需第32天)');
eq(plan.reviewWords.length, 10, '第31天应正好10个复习词');

// 第5天：只有第1~4天的词可能到期（第1天词需第31天），所以第5天无复习
plan = computeTodayPlan(words100, 5, 10, {}, {});
eq(plan.reviewWords.length, 0, '第5天无复习词（第1天词需第31天才到期）');
eq(plan.newWords.length, 10, '第5天有10个新词');

// 有错误次数：w0 错1次 → 间隔15 → 第1+15=16天到期
plan = computeTodayPlan(words100, 16, 10, { w0: 1 }, {});
assert(plan.reviewWords.includes('w0'), 'w0 错1次 → 第16天到期');
plan = computeTodayPlan(words100, 15, 10, { w0: 1 }, {});
assert(!plan.reviewWords.includes('w0'), 'w0 错1次 → 第15天未到期');

// ============ 3.5 learnedDay 显式固化（避免中途改每日词数导致漂移）============
section('learnedDay 显式固化');
// 场景：先以每日10词学完 w0..w99，固化各词 learnedDay
const learnedFixed: Record<string, number> = {};
for (let i = 0; i < 100; i++) learnedFixed[`w${i}`] = Math.floor(i / 10) + 1;
// 之后把每日词数改为 5。第9天、w50 错3次（间隔3）：
// - 显式 learnedDay：w50 在第6天学 → 6+3=9 到期 → 第9天应出现
// - 回退 index/wpd：w50 在 index50、wpd=5 → 第11天学 → 11+3=14 → 第9天未到期（漂移！）
plan = computeTodayPlan(words100, 9, 5, { w50: 3 }, {}, learnedFixed);
assert(plan.reviewWords.includes('w50'), '显式 learnedDay：w50(第6天)错3次→第9天到期');
const driftPlan = computeTodayPlan(words100, 9, 5, { w50: 3 }, {});
assert(!driftPlan.reviewWords.includes('w50'), '回退 index/wpd 算法在改 wpd 后漂移(w50 误判未到期)');
// 第31天、无错误：w0 显式第1天学 → 1+30=31 到期
plan = computeTodayPlan(words100, 31, 5, {}, {}, learnedFixed);
assert(plan.reviewWords.includes('w0'), '显式 learnedDay：w0(第1天)在31天到期(不受 wpd=5 影响)');
assert(plan.reviewWords.includes('w9'), 'w9(第1天)在31天到期');
assert(!plan.reviewWords.includes('w10'), 'w10(第2天)需第32天');

// ============ 4. 复习排程契约（markReviewed → 不再当日重复）============
section('复习排程契约');
// 第31天复习 w0（0错）→ 排程到第61天；当天不应再出现
const sched = { w0: scheduleNextReview(31, 0) };
plan = computeTodayPlan(words100, 31, 10, { w0: 0 }, sched);
assert(!plan.reviewWords.includes('w0'), '复习当天(31) w0 不应重复出现');
plan = computeTodayPlan(words100, 61, 10, { w0: 0 }, sched);
assert(plan.reviewWords.includes('w0'), '第61天 w0 再次到期');

// ============ 5. mergeStats ============
section('mergeStats 字段级合并');
const localStats = {
  wrongWords: ['a'],
  history: [{ date: '2026-01-01', word: 'a', mode: 'spell', correct: false }],
  errorCounts: { a: 1, b: 1 },
  reviewSchedule: { a: 5 },
};
const remoteStats = {
  wrongWords: ['b'],
  history: [
    { date: '2026-01-01', word: 'a', mode: 'spell', correct: false }, // 重复，应去重
    { date: '2026-01-02', word: 'b', mode: 'spell', correct: true },
  ],
  errorCounts: { a: 2, c: 3 },
  reviewSchedule: { a: 3, b: 9 },
};
const ms = mergeStats(JSON.stringify(localStats), remoteStats);
eq(ms.history.length, 2, 'history 去重后保留2条');
eq(ms.wrongWords.sort(), ['a', 'b'], 'wrongWords 取并集');
eq(ms.errorCounts, { a: 2, b: 1, c: 3 }, 'errorCounts 取 max');
eq(ms.reviewSchedule, { a: 3, b: 9 }, 'reviewSchedule 取更早(a: min(5,3)=3)');

// ============ 6. mergeEnriched ============
section('mergeEnriched 按词合并');
const localE = { cat: { word: 'cat', chinese: '猫', definition: '', example: '', manual: true } };
const remoteE = {
  cat: { word: 'cat', chinese: '', definition: 'feline', example: '', manual: false },
  dog: { word: 'dog', chinese: '狗', definition: '', example: '', manual: false },
};
const me = mergeEnriched(JSON.stringify(localE), remoteE);
eq(me.cat.chinese, '猫', 'cat 保留本地中文释义');
eq(me.cat.definition, 'feline', 'cat 补全英文释义');
assert(me.cat.manual === true, 'cat 保留 manual 标记');
assert(me.dog && me.dog.chinese === '狗', 'dog 来自远端');

// ============ 7. applyLocal 词库并集 + plans 取最大 ============
section('applyLocal 词库并集 / plans 取最大');
const st = new MockStorage();
st.setItem('spellgame_batches', JSON.stringify({ batches: [{ id: 'a', words: ['z'] }], currentBatchId: 'a' }));
st.setItem('spellgame_stats', JSON.stringify(localStats));
const backup: CloudBackup = {
  updatedAt: '2026-07-14',
  banks: { batches: [{ id: 'a', words: ['z'] }, { id: 'b', words: ['y'] }], currentBatchId: 'b' },
  stats: remoteStats,
  enriched: undefined,
  settings: undefined,
  plans: { x: '5', y: '2' },
};
// 本地已有 spellplan_x=3（更旧），spellplan_y 不存在
st.setItem('spellplan_x', '3');
applyLocal(backup, st);
const banksAfter = JSON.parse(st.getItem('spellgame_batches')!);
const ids = banksAfter.batches.map((b: any) => b.id).sort();
eq(ids, ['a', 'b'], '词库按 id 并集（a 来自本地，b 来自云端）');
// stats 合并后 history 去重为 2 条
const statsAfter = JSON.parse(st.getItem('spellgame_stats')!);
eq(statsAfter.history.length, 2, 'applyLocal 合并 stats（history 去重）');
eq(statsAfter.errorCounts, { a: 2, b: 1, c: 3 }, 'applyLocal 合并 stats（errorCounts max）');
// plans 取最大
eq(st.getItem('spellplan_x'), '5', 'plans.x 取最大(5>3)');
eq(st.getItem('spellplan_y'), '2', 'plans.y 采用云端 2');

// ============ 8. collectLocal 往返 ============
section('collectLocal 往返');
const st2 = new MockStorage();
st2.setItem('spellplan_x', '5');
st2.setItem('spellgame_stats', JSON.stringify(localStats));
const collected = collectLocal(st2);
eq(collected.plans, { x: '5' }, 'collectLocal 收集 plans');
assert(collected.stats !== undefined, 'collectLocal 收集 stats');
// 写入新存储并读取
const st3 = new MockStorage();
applyLocal(collected, st3);
eq(st3.getItem('spellplan_x'), '5', '往返后 plans 一致');

// ============ 9. crypto Token 加密往返（需 Web Crypto）============
section('crypto Token 加密往返');
try {
  const enc = await encryptString('ghp_topsecret_token', 'mypass123');
  assert((await decryptString(enc, 'mypass123')) === 'ghp_topsecret_token', '正确密码可解密还原明文');
  let threw = false;
  try { await decryptString(enc, 'wrongpass'); } catch { threw = true; }
  assert(threw, '错误密码解密应抛异常(AES-GCM 认证失败)');
  assert(enc.cipher !== 'ghp_topsecret_token' && !!enc.salt && !!enc.iv, '密文与盐/iv 均已生成');
} catch (e: any) {
  console.log('  (crypto 测试跳过：' + (e?.message || e) + ')');
}

// ============ 汇总 ============
console.log(`\n==== 结果：${pass} 通过 / ${fail} 失败 ====`);
if (fail > 0) {
  console.log('失败项：\n - ' + failures.join('\n - '));
  process.exitCode = 1;
}

}

main();
