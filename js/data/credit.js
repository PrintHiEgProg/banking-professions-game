// Кредитный эксперт: заёмщики пяти смен.
// Факт документа: [подпись, значение, ключ, флаги]. Противоречие — пара ключей, подделка — факт с fake: true.
// truth: ok — честный; fraud — мошенник; victim — подставной заёмщик; nobiz — бизнес без выручки.

import { artyomIntro, story } from '../story.js';

export const RATE = 0.2; // 20% годовых
export const TERMS = [6, 12, 18, 24, 36, 48, 60];

export function payment(amount, months) {
  const r = RATE / 12;
  return Math.round((amount * r) / (1 - Math.pow(1 + r, -months)));
}

const L = {
  anna: { style: 'long', back: 'long', hair: '#b5651d', shirt: '#2a9d8f', bg: '#21363a', earrings: true },
  denis: { style: 'cap', hair: '#2a1d17', young: true, shirt: '#ff6b6b', bg: '#3a2228' },
  sergey: { style: 'side', hair: '#5d4037', mustache: true, shirt: '#607d8b', bg: '#263238', skin: 1 },
  marina: { style: 'bun', hair: '#1d1d1d', shirt: '#c77dff', bg: '#2d2440', earrings: true },
  viktor: { style: 'short', hair: '#e0c068', glasses: true, shirt: '#264653', tie: '#e9c46a', bg: '#1c2b33' },
  olga: { style: 'long', hair: '#8d5524', shirt: '#f4a261', bg: '#3a2e22', skin: 1 },
  maxim: { style: 'short', hair: '#3e2723', young: true, shirt: '#90be6d', bg: '#25331f' },
  petr: { style: 'curly', hair: '#6d4c41', beard: true, shirt: '#3a86ff', bg: '#1d2a44' },
  natalia: { style: 'long', back: 'long', hair: '#d4a373', shirt: '#e63946', bg: '#3a1f22' },
  kirill: { style: 'side', hair: '#212121', shirt: '#495057', bg: '#22262a', skin: 2 },
  kirillPhoto: { style: 'short', hair: '#c49a6c', glasses: true, shirt: '#495057', bg: '#cfd8dc' },
  alexey: { style: 'short', hair: '#8a6a4a', glasses: true, shirt: '#06d6a0', bg: '#1f3a35' },
  elena: { style: 'bun', hair: '#a0522d', shirt: '#118ab2', bg: '#1b2d3a', earrings: true },
  svetlana: { style: 'bun', hair: '#d9a066', shirt: '#ffffff', scarf: '#e76f51', bg: '#3a2e22', skin: 3 },
  igor: { style: 'side', hair: '#111111', beard: true, shirt: '#8338ec', bg: '#281f3a' },
  denis2: { style: 'short', hair: '#2a1d17', shirt: '#ff6b6b', bg: '#3a2228' },
  artyom: { style: 'side', hair: '#1d1d1d', young: true, shirt: '#06d6a0', bg: '#1d2f45' },
};

const PASS = (fio, age, photo) => ({ id: 'passport', icon: '🪪', title: 'Паспорт', rows: [['ФИО', fio, 'fio'], ['Возраст', `${age}`, 'age']], photo });

export const CREDIT_SHIFTS = {
  1: {
    clients: [
      {
        id: 'anna', name: 'Анна', age: 31, look: L.anna, goal: 'Холодильник', goalIcon: '🧊', amount: 40000, term: 12, income: 50000, debts: 0, truth: 'ok', refuseOk: false,
        docs: [PASS('Иванова Анна', 31, L.anna), { id: 'income', icon: '📄', title: 'Справка о доходах', rows: [['Зарплата', '50 000 ₽', 'sal_doc'], ['Компания', '«Север»', 'co']] }, { id: 'history', icon: '📚', title: 'Кредитная история', rows: [['Кредиты сейчас', 'нет', 'debts'], ['Просрочки', 'нет', 'late']] }],
        green: 'Платит вовремя. Холодильник гудит 🧊',
      },
      {
        id: 'denis', name: 'Денис', age: 19, look: L.denis, goal: 'iPhone до зарплаты', goalIcon: '📱', amount: 120000, term: 6, income: 45000, debts: 0, truth: 'ok', refuseOk: false,
        docs: [PASS('Котов Денис', 19, L.denis), { id: 'income', icon: '📄', title: 'Справка о доходах', rows: [['Зарплата', '45 000 ₽', 'sal_doc'], ['Работает', '8 месяцев', 'since']] }, { id: 'history', icon: '📚', title: 'Кредитная история', rows: [['Кредиты сейчас', 'нет', 'debts']] }],
        green: 'Платёж посильный — Денис платит и даже копит',
        red: 'Платёж съел половину зарплаты — просрочки, долг растёт 📉',
        missed: 'Отказали — Денис взял кредит в другом банке и спокойно платит',
      },
      {
        id: 'maxim', name: 'Максим', age: 20, look: L.maxim, goal: '«На развитие»', goalIcon: '❔', amount: 500000, term: 24, income: 60000, debts: 0, truth: 'victim', friend: 'Руслан', nameGen: 'Максима', climax: true, story: 'maxim',
        coach: { easy: '👀 На вопросы отвечает друг, а не Максим. Спроси что-нибудь — и поговори с Максимом наедине.', normal: '👀 Странно, что за клиента отвечает друг. Задай пару вопросов.' },
        rescue: { won: '«Мне обещали 30 000 за то, что я возьму кредит, — а платить, мол, будут они… Спасибо, что объяснили»', wonNote: 'Подставной заёмщик: кредит оформляют на него, деньги забирают «друзья», а долг остаётся на нём.', lost: '«Руслан сказал, что всё будет нормально…»', lostNote: 'Кредит не выдали, но Максим не понял, в какую схему его втянули. Он может пойти в другой банк.' },
        docs: [PASS('Сомов Максим', 20, L.maxim), { id: 'income', icon: '📄', title: 'Справка о доходах', rows: [['Зарплата', '60 000 ₽', 'sal_doc'], ['Должность', 'курьер', 'job']] }],
        questions: [
          ['🎯', 'Зачем вам деньги?', 'friend', 'На бизнес! Мы вместе открываем!'],
          ['💼', 'Где вы работаете?', 'friend', 'Курьером он работает, всё стабильно'],
          ['🤔', 'Что за бизнес?', 'self', 'Э-э… Руслан, что за бизнес?'],
        ],
        talk: {
          start: 30,
          win: 50,
          nodes: [
            { say: 'Ну… Руслан сказал, тут всё просто.', emo: 'worried', choices: [
              { tag: 'calm', text: 'Мы одни. Расскажи как есть — я помогу.', trust: 25, reply: 'Мне обещали 30 000 за то, что я возьму кредит. Платить будут они…' },
              { tag: 'logic', text: 'Кредит будет на тебе. Платить придётся тебе.', trust: 15, reply: 'Как на мне? Он сказал — они заплатят…' },
              { tag: 'pressure', text: 'Ты что, мошенник?', trust: -20, reply: 'Я ничего не сделал!' },
            ] },
            { say: 'И что мне теперь делать?', emo: 'scared', choices: [
              { tag: 'calm', text: 'Не бери кредит за других. Это ловушка — долг останется на тебе.', trust: 25, reply: 'Спасибо… Я, кажется, чуть не влип.' },
              { tag: 'logic', text: 'Откажись и заблокируй этого «друга».', trust: 15, reply: 'Да. Так и сделаю.' },
              { tag: 'pressure', text: 'Сам виноват.', trust: -20, reply: '…' },
            ] },
          ],
        },
        red: '«Друзья» забрали деньги и пропали. Долг 500 000 ₽ — на Максиме 💔',
        yellow: 'Отказали, но не предупредили — Максим пошёл в другой банк',
        saved: 'Максим отказался от схемы. Сказал, что расскажет друзьям 🙏',
      },
    ],
  },
  2: {
    clients: [
      {
        id: 'marina', name: 'Марина', age: 36, look: L.marina, goal: 'Машина с пробегом', goalIcon: '🚙', amount: 400000, term: 36, income: 45000, declared: 120000, debts: 0, truth: 'ok', refuseOk: true,
        docs: [
          PASS('Белова Марина', 36, L.marina),
          { id: 'income', icon: '📄', title: 'Справка о доходах', rows: [['Зарплата', '120 000 ₽', 'sal_doc'], ['Компания', '«ЮгСтрой»', 'co']] },
          { id: 'statement', icon: '🏦', title: 'Выписка по счёту', rows: [['Поступления в месяц', '45 000 ₽', 'sal_bank'], ['От кого', '«ЮгСтрой»', 'co2']] },
        ],
        conflicts: [['sal_doc', 'sal_bank', 'Зарплата в справке ≠ поступления по выписке']],
        green: 'Платёж по реальному доходу — Марина платит без просрочек 🚙',
        yellow: 'Платёж на грани — пару раз просрочила',
        red: 'Кредит считали по справке, а денег втрое меньше — просрочки',
        refused: 'Отказали из-за справки. Справедливо: документы подогнали',
      },
      {
        id: 'viktor', name: 'Виктор', age: 29, look: L.viktor, goal: '«На бизнес»', goalIcon: '💼', amount: 900000, term: 60, income: 150000, debts: 0, truth: 'fraud',
        docs: [
          PASS('Лисин Виктор', 29, L.viktor),
          { id: 'income', icon: '📄', title: 'Справка о доходах', rows: [['Зарплата', '150 000 ₽', 'sal_doc'], ['Стаж в компании', '5 лет', 'since'], ['Печать', 'ООО «Альфа-Тред»', 'stamp', 'fake']] },
          { id: 'registry', icon: '🏛', title: 'Выписка из реестра компаний', rows: [['Компания', 'ООО «Альфа-Трейд»', 'co_reg'], ['Создана', '2 года назад', 'created']] },
        ],
        conflicts: [['since', 'created', 'Стаж 5 лет, а компании всего 2 года'], ['stamp', 'co_reg', 'В печати ошибка в названии компании']],
        red: 'Не заплатил ни разу — справка была поддельной. Банк потерял 900 000 ₽',
        refused: 'Поддельная справка не прошла. Мошенник ушёл ни с чем 🛡',
      },
      {
        id: 'olga', name: 'Ольга', age: 41, look: L.olga, goal: 'Отпуск', goalIcon: '🏖', amount: 80000, term: 12, income: 70000, debts: 0, truth: 'ok', refuseOk: false,
        docs: [PASS('Зуева Ольга', 41, L.olga), { id: 'income', icon: '📄', title: 'Справка о доходах', rows: [['Зарплата', '70 000 ₽', 'sal_doc']] }, { id: 'statement', icon: '🏦', title: 'Выписка по счёту', rows: [['Поступления в месяц', '70 000 ₽', 'sal_bank']] }],
        green: 'Отдохнула и платит по графику 🏖',
        missed: 'Отказали честному клиенту — Ольга ушла в другой банк',
      },
    ],
  },
  3: {
    clients: [
      {
        id: 'petr', name: 'Пётр', age: 33, look: L.petr, goal: 'Мощный ноутбук', goalIcon: '💻', amount: 150000, term: 24, income: 80000, debts: 0, truth: 'ok', refuseOk: false,
        docs: [PASS('Громов Пётр', 33, L.petr), { id: 'statement', icon: '🏦', title: 'Выписка за год', rows: [['Средний доход', '80 000 ₽', 'sal_bank'], ['Откуда', 'заказчики (фриланс)', 'src']] }],
        questions: [
          ['💼', 'Где вы работаете?', 'self', 'Я фрилансер, рисую сайты'],
          ['📈', 'Доход стабильный?', 'self', 'Да, вот выписка за весь год'],
          ['💳', 'Есть другие кредиты?', 'self', 'Нет, ни одного'],
        ],
        green: 'Новый ноутбук — новые заказы. Платит без просрочек 💻',
        missed: 'Отказали фрилансеру со стабильным доходом — упустили хорошего клиента',
      },
      {
        id: 'sergey', name: 'Сергей', age: 44, look: L.sergey, goal: 'Ремонт', goalIcon: '🔨', amount: 300000, term: 24, income: 60000, debts: 15000, truth: 'ok', refuseOk: true,
        docs: [PASS('Орлов Сергей', 44, L.sergey), { id: 'income', icon: '📄', title: 'Справка о доходах', rows: [['Зарплата', '60 000 ₽', 'sal_doc']] }, { id: 'history', icon: '📚', title: 'Кредитная история', rows: [['Кредиты сейчас', '2 кредита', 'debts_n'], ['Платежи по ним', '15 000 ₽ / мес', 'debts']] }],
        questions: [
          ['💳', 'Есть другие кредиты?', 'self', 'Есть два, но я справляюсь!'],
          ['🔨', 'Зачем ремонт?', 'self', 'Крыша течёт, зимой будет плохо'],
          ['💼', 'Где вы работаете?', 'self', 'Мастером на заводе, 12 лет'],
        ],
        red: 'Сергей взял третий кредит, чтобы платить по первым двум 🕳',
        refused: 'Отказ уберёг Сергея от долговой ямы',
      },
      {
        id: 'natalia', name: 'Наталья', age: 38, look: L.natalia, goal: 'Новая кухня', goalIcon: '🍳', amount: 200000, term: 24, income: 55000, debts: 21000, truth: 'ok', refuseOk: true,
        docs: [PASS('Крылова Наталья', 38, L.natalia), { id: 'income', icon: '📄', title: 'Справка о доходах', rows: [['Зарплата', '55 000 ₽', 'sal_doc']] }, { id: 'history', icon: '📚', title: 'Кредитная история', rows: [['Кредиты сейчас', '3 кредита', 'debts_n'], ['Платежи по ним', '21 000 ₽ / мес', 'debts']] }],
        questions: [
          ['💳', 'Есть другие кредиты?', 'self', 'Нет, что вы!', 'ans_debts'],
          ['💼', 'Где вы работаете?', 'self', 'В школе, учителем'],
        ],
        conflicts: [['ans_debts', 'debts_n', 'Сказала «нет кредитов», а в истории их три']],
        red: 'Четвёртый кредит, чтобы платить по трём. Долговая яма 🕳',
        refused: 'Отказ уберёг Наталью от четвёртого кредита',
      },
    ],
  },
  4: {
    scoring: true,
    clients: [
      {
        id: 'kirill', name: 'Кирилл', age: 35, look: L.kirill, goal: 'Наличные', goalIcon: '💵', amount: 300000, term: 36, income: 90000, debts: 0, truth: 'fraud', score: 91,
        docs: [
          { id: 'passport', icon: '🪪', title: 'Паспорт', rows: [['ФИО', 'Яковлев Кирилл', 'fio'], ['Возраст', '35', 'age'], ['Фото', 'не похож на клиента', 'photo', 'fake']], photo: L.kirillPhoto },
          { id: 'income', icon: '📄', title: 'Справка о доходах', rows: [['Зарплата', '90 000 ₽', 'sal_doc']] },
        ],
        red: 'Кредит оформили по чужому паспорту. Настоящий Кирилл узнал о долге из СМС 😱',
        refused: 'Робот ошибся, а ты — нет: паспорт был чужой 🛡',
      },
      {
        id: 'artyom', name: 'Артём', age: 20, look: L.artyom, goal: 'Электровелосипед для работы', goalIcon: '🛵', amount: 90000, term: 12, income: 45000, debts: 0, truth: 'ok', refuseOk: false, score: 38, story: 'artyomCredit',
        say: (state) => artyomIntro(state),
        docs: [PASS('Соколов Артём', 20, L.artyom), { id: 'income', icon: '📄', title: 'Справка о доходах', rows: [['Зарплата курьера', '45 000 ₽', 'sal_doc'], ['Работает', '1 год 4 месяца', 'since']] }, { id: 'statement', icon: '🏦', title: 'Накопительный счёт', rows: [['Откладывал каждый месяц', '8 000 ₽', 'save'], ['Просрочек', 'ни одной', 'late']] }],
        green: 'Робот ошибся: Артём возит вдвое больше заказов и платит без просрочек 🛵',
        missed: 'Поверили роботу «молодой, мало истории» и отказали — Артём ушёл к конкурентам',
      },
      {
        id: 'elena', name: 'Елена', age: 45, look: L.elena, goal: 'Машина в залог', goalIcon: '🚗', amount: 1200000, term: 60, income: 90000, debts: 0, truth: 'ok', refuseOk: false, score: 74, collateral: 900000,
        docs: [PASS('Миронова Елена', 45, L.elena), { id: 'income', icon: '📄', title: 'Справка о доходах', rows: [['Зарплата', '90 000 ₽', 'sal_doc']] }, { id: 'car', icon: '🚗', title: 'Оценка машины (залог)', rows: [['Модель', 'кроссовер, 2021', 'model'], ['Стоит', '900 000 ₽', 'car_price']] }],
        green: 'Кредит меньше цены машины — залог надёжен, Елена платит 🚗',
        red: 'Кредит больше цены машины: залог не покрывает долг',
        missed: 'Отказали, хотя можно было уменьшить сумму до цены машины',
      },
    ],
  },
  5: {
    scoring: true,
    insurance: true,
    clients: [
      {
        id: 'svetlana', name: 'Светлана', age: 39, look: L.svetlana, goal: 'Печь для пекарни «Каравай»', goalIcon: '🥐', amount: 800000, term: 36, income: 100000, debts: 0, truth: 'ok', refuseOk: false, business: true, score: 66, story: 'bakery',
        say: (state) => (story(state).bakeryCash ? 'Ваши инкассаторы каждое утро забирают у меня выручку — вот отчёт. Нужна вторая печь: очередь за хлебом на улицу!' : 'Пекарня «Каравай» работает третий год. Нужна новая печь — очередь за хлебом на улицу!'),
        revenue: [410, 430, 400, 450, 470, 460, 480, 500, 490, 510, 520, 515],
        docs: [PASS('Пекарь Светлана', 39, L.svetlana), { id: 'biz', icon: '📊', title: 'Отчёт пекарни «Каравай»', rows: [['Выручка в месяц', '~480 000 ₽', 'rev'], ['Расходы', '~380 000 ₽', 'exp'], ['Прибыль', '100 000 ₽', 'profit']] }],
        event: 'Пожар у соседей — пекарня закрыта 2 месяца',
        green: '«Каравай» с новой печью — очередь за круассанами 🥐',
        insured: 'Страховка покрыла 2 месяца простоя — платежи без просрочек ☂️',
        yellow: 'Без страховки 2 месяца простоя — просрочки',
        missed: 'Отказали — пекарня взяла кредит у конкурента и процветает',
      },
      {
        id: 'igor', name: 'Игорь', age: 26, look: L.igor, goal: 'Кофейня «Мечта»', goalIcon: '☕', amount: 2000000, term: 60, income: 40000, debts: 0, truth: 'nobiz', business: true, score: 52,
        revenue: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
        docs: [PASS('Сорокин Игорь', 26, L.igor), { id: 'biz', icon: '📊', title: 'Бизнес-план «Мечта»', rows: [['Выручка', 'пока нет', 'rev'], ['Опыт', 'люблю кофе ☕', 'exp'], ['Личный доход', '40 000 ₽', 'sal_doc']] }],
        red: 'Кофейня закрылась через 3 месяца. Долг 2 000 000 ₽ — на Игоре',
        refused: 'Отказ без выручки — правильно. Игорь пошёл работать бариста, чтобы набраться опыта ☕',
      },
      {
        id: 'denis2', name: 'Денис', age: 20, look: L.denis2, goal: 'Курсы программирования', goalIcon: '👨‍💻', amount: 60000, term: 12, income: 55000, debts: 0, truth: 'ok', refuseOk: false, score: 81, returning: 'denis',
        docs: [PASS('Котов Денис', 20, L.denis2), { id: 'income', icon: '📄', title: 'Справка о доходах', rows: [['Зарплата', '55 000 ₽', 'sal_doc']] }],
        green: 'Денис отучился и устроился разработчиком 👨‍💻',
        missed: 'Отказали — Денис учился бесплатно по видео, но дольше',
      },
    ],
  },
};
