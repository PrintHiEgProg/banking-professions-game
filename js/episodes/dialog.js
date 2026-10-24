// Разговор лицом к лицу со шкалой доверия: общий компонент для разных профессий.
// script: { start, win, nodes: [{ say, emo, choices: [{ tag, text, trust, reply, k? }] }] }
import { KNOWLEDGE } from '../data/professions.js';
import { el, sleep, typeText, VOICE } from '../ui.js';
import { person } from '../portraits.js';

const TAGS = {
  calm: ['🤝', 'Поддержка'],
  logic: ['💡', 'Довод'],
  pressure: ['⚡', 'Напор'],
};

export function runDialog(container, ctx, { name, look, script, intro = null }) {
  const { audio } = ctx;
  let trust = script.start;
  return new Promise((resolve) => {
    container.innerHTML = '';
    const ava = el('div', { class: 'dlg-ava', html: person(look, 'scared') });
    const fill = el('i');
    const val = el('b', {}, String(trust));
    const lines = el('div', { class: 'dlg-lines' });
    const choices = el('div', { class: 'choices dlg-choices' });
    container.append(
      el(
        'div',
        { class: 'dlg' },
        el('div', { class: 'dlg-head' }, ava, el('div', { class: 'dlg-meta' }, el('b', {}, name), el('div', { class: 'meter trust' }, el('div', { class: 'meter-head' }, el('span', {}, '💚 Доверие'), val), el('div', { class: 'meter-bar' }, fill)))),
        lines,
        choices,
      ),
    );
    fill.parentElement.style.setProperty('--goal', `${script.win}%`);
    const render = () => {
      fill.style.transform = `scaleX(${Math.max(0, trust) / 100})`;
      val.textContent = String(trust);
      fill.parentElement.classList.toggle('goal', trust >= script.win);
    };
    render();
    const scroll = () => (lines.scrollTop = lines.scrollHeight);

    async function say(text, emo) {
      text = text.replace('{name}', ctx.state.nickname);
      if (emo) ava.innerHTML = person(look, emo);
      const p = el('p');
      lines.append(el('div', { class: 'line gran' }, p));
      await typeText(p, text, { speed: 20, voice: VOICE.gran, onTick: scroll });
      scroll();
    }

    function choose(node) {
      choices.innerHTML = '';
      return new Promise((res) => {
        for (const ch of node.choices) {
          const [icon, label] = TAGS[ch.tag];
          const k = ch.k && KNOWLEDGE[ch.k];
          const locked = k && !ctx.state.knowledge.includes(ch.k);
          const b = el(
            'button',
            { class: `choice ${ch.tag}${locked ? ' locked' : ''}`, disabled: locked },
            el('span', { class: `tag ${ch.tag}` }, `${icon} ${label}`),
            k && !locked ? el('span', { class: 'need' }, `${k.icon} ${k.title}`) : null,
            el('span', { class: 'choice-text' }, locked ? `🔒 Нужно знание ${k.icon} «${k.title}»` : ch.text),
          );
          if (!locked)
            b.addEventListener('click', () => {
              audio.click();
              choices.innerHTML = '';
              res(ch);
            });
          choices.append(b);
        }
        scroll();
      });
    }

    (async () => {
      if (intro) {
        lines.append(el('div', { class: 'line sys' }, intro));
        await sleep(400);
      }
      for (const node of script.nodes) {
        await say(node.say, node.emo);
        const ch = await choose(node);
        lines.append(el('div', { class: 'line me' }, el('p', {}, ch.text)));
        trust = Math.max(0, Math.min(100, trust + ch.trust));
        render();
        if (ch.trust < 0) audio.wrong();
        else audio.coin();
        await say(ch.reply, ch.trust < 0 ? 'angry' : 'worried');
        if (trust <= 0) break;
        await sleep(200);
      }
      const won = trust >= script.win;
      ava.innerHTML = person(look, won ? 'cry' : 'angry');
      await sleep(500);
      resolve({ won, trust });
    })();
  });
}
