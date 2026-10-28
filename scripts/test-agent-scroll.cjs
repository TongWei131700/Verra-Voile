// Browser regression test. Uses a mocked Socket.IO module; never calls the real Agent.
const puppeteer = require('puppeteer');
const assert = require('node:assert/strict');
(async () => { const b = await puppeteer.launch({ headless: true }); try {
    for (const mobile of [false, true]) {
        const p = await b.newPage();
        await p.setViewport({ width: mobile ? 390 : 1280, height: mobile ? 844 : 900, isMobile: mobile, hasTouch: mobile });
        await p.setRequestInterception(true);
        p.on('request', r => { if (/socket[._-]+io-client.*\.js/.test(r.url()))
            return r.respond({ status: 200, contentType: 'application/javascript', body: `export function io(){const handlers=new Map();const s={connected:true,on(n,f){if(!handlers.has(n))handlers.set(n,new Set());handlers.get(n).add(f);return s},off(n,f){handlers.get(n)?.delete(f);return s},emit(n,d){(window.__sent??=[]).push([n,d]);return s},disconnect(){s.connected=false}};window.__agentEvent=e=>handlers.get('agent_event')?.forEach(f=>f(e));return s}` }); if (r.url().includes('/api/analytics'))
            return r.respond({ status: 200, contentType: 'application/json', body: '{}' }); r.continue(); });
        await p.goto((process.env.BASE_URL || 'http://localhost:5173') + '/agent-chat', { waitUntil: 'networkidle0' });
        await p.waitForFunction(() => typeof window.__agentEvent === 'function');
        for (let turn = 1; turn <= 2; turn++) {
            await p.type('textarea', '测试第' + turn + '轮');
            await p.keyboard.press('Enter');
            await p.waitForFunction(n => window.__sent?.filter(x => x[0] === 'chat').length === n, {}, turn);
            await p.evaluate(turn => { window.__agentEvent({ type: 'thinking', label: '很长的思考步骤'.repeat(25) }); window.__agentEvent({ type: 'token', content: ('第' + turn + '轮结果\n\n').repeat(100) }); window.__agentEvent({ type: 'done' }); window.__agentEvent({ type: 'done' }); }, turn);
            await p.waitForFunction(n => JSON.parse(sessionStorage.getItem('agent_chat_turns') || '[]').length === n, {}, turn);
            await p.evaluate(() => { const el = document.querySelector('.agent-messages'); el.scrollTop = 100; el.dispatchEvent(new Event('scroll')); });
            await new Promise(r => setTimeout(r, 800));
            const result = await p.evaluate(() => ({ top: document.querySelector('.agent-messages').scrollTop, turns: JSON.parse(sessionStorage.getItem('agent_chat_turns')).length }));
            assert.equal(result.turns, turn);
            assert.ok(result.top <= 110, 'scroll forced to bottom ' + result.top);
        }
        await p.type('textarea', '花朵');
        await p.keyboard.press('Enter');
        await p.waitForFunction(() => window.__sent.filter(x => x[0] === 'chat').length === 3);
        await p.evaluate(() => {
            const sent = window.__sent.filter(x => x[0] === 'chat');
            const previousId = sent[1][1].requestId;
            const requestId = sent[2][1].requestId;
            window.__agentEvent({ type: 'thinking', requestId, label: '查询花卉商品中' });
            // Simulate delayed events from the previous request arriving during turn 3.
            window.__agentEvent({ type: 'token', requestId: previousId, content: '不应混入的旧摄影师回复' });
            window.__agentEvent({ type: 'done', requestId: previousId });
        });
        await new Promise(r => setTimeout(r, 100));
        const pending = await p.evaluate(() => {
            const question = [...document.querySelectorAll('.agent-msg--user')].at(-1);
            const container = document.querySelector('.agent-messages');
            const q = question.getBoundingClientRect(), c = container.getBoundingClientRect();
            return { count: document.querySelectorAll('.agent-msg--user').length,
                text: question.textContent, visible: q.height > 0 && q.top >= c.top && q.bottom <= c.bottom,
                turns: JSON.parse(sessionStorage.getItem('agent_chat_turns')).length };
        });
        assert.equal(pending.count, 3);
        assert.ok(pending.text.includes('花朵'));
        assert.ok(pending.visible, 'latest question disappears during generation');
        assert.equal(pending.turns, 2, 'stale done finishes the active question');
        await p.evaluate(() => {
            const requestId = window.__sent.filter(x => x[0] === 'chat')[2][1].requestId;
            window.__agentEvent({ type: 'token', requestId, content: '新花朵推荐：[TABLE_1]' });
            window.__agentEvent({ type: 'table_data', requestId, index: 1, content: '| 花朵 | 价格 |\n|---|---|\n| 玫瑰 | €40 |' });
            window.__agentEvent({ type: 'done', requestId });
            window.__agentEvent({ type: 'done', requestId });
        });
        await p.waitForFunction(() => JSON.parse(sessionStorage.getItem('agent_chat_turns')).length === 3);
        const final = await p.evaluate(() => ({
            turns: JSON.parse(sessionStorage.getItem('agent_chat_turns')),
            ids: window.__sent.filter(x => x[0] === 'chat').map(x => x[1].requestId),
            text: document.querySelector('.agent-messages').textContent,
        }));
        assert.equal(final.turns[2].text, '新花朵推荐：[TABLE_1]');
        assert.equal(final.turns[2].userMessageId, final.ids[2]);
        assert.ok(!final.text.includes('不应混入'));
        await p.reload({ waitUntil: 'networkidle0' });
        assert.equal(await p.$$eval('.agent-msg--user', nodes => nodes.length), 3);
        assert.ok((await p.$eval('.agent-messages', el => el.textContent)).includes('新花朵推荐'));
        console.log((mobile ? 'mobile' : 'desktop') + ': multi-turn scrolling, visible third question, stale-event isolation, tables, duplicate done and reload PASS');
        await p.close();
    }
}
finally {
    await b.close();
} })().catch(e => { console.error(e); process.exit(1); });
