// Контент главы 1 «Первая неделя»: 5 смен — 5 граней профессии.
// Механики читают только эти данные, поэтому новые смены и главы добавляются без переписывания кода.

// ─────────────────────────── Смены ───────────────────────────
export const SHIFTS = [
  {
    n: 1, id: 'phishing', title: 'Рассылка', day: 'Понедельник', time: '10:15', sky: 'day',
    skill: 'Распознавание фишинга', icon: '✉️',
    goal: 'Разбери жалобы и заблокируй фальшивые сообщения',
    bullets: [['👆', 'Тапай на подозрительное'], ['🛑', 'Блокируй фишинг'], ['✅', 'Настоящие — пропускай']],
    alarm: true,
    hello: '{name}, привет! Мошенники запустили рассылку. Садись за главный монитор.',
    steps: [{ target: 'monitor', objective: 'Открой главный монитор', run: 'phishing' }],
  },
  {
    n: 2, id: 'flow', title: 'Поток', day: 'Вторник', time: '14:40', sky: 'day',
    skill: 'Мониторинг операций', icon: '📊',
    goal: 'Пропускай честные платежи, останавливай подозрительные',
    bullets: [['⚠️', 'Ищи отклонения от привычек'], ['🛑', '2 и больше ⚠ — блокируй'], ['⏱', 'Решай быстро']],
    alarm: false,
    hello: 'Сегодня — живой поток платежей. Он на видеостене.',
    steps: [{ target: 'wall', objective: 'Подойди к видеостене', run: 'flow' }],
  },
  {
    n: 3, id: 'rules', title: 'Правило', day: 'Среда', time: '18:50', sky: 'evening',
    skill: 'Настройка антифрод-системы', icon: '⚙️',
    goal: 'Научи систему ловить мошенников без тебя',
    bullets: [['🧩', 'Выбери сигналы'], ['🎚', 'Задай порог'], ['▶️', 'Проверь на данных']],
    alarm: false,
    hello: 'Руками всё не поймать. Научим систему! Правый монитор.',
    steps: [{ target: 'radar', objective: 'Открой правый монитор — настройки', run: 'rules' }],
  },
  {
    n: 4, id: 'call', title: 'Безопасный счёт', day: 'Четверг', time: '23:52', sky: 'night',
    skill: 'Работа с клиентами', icon: '📞',
    goal: 'Отговори клиентку от перевода мошенникам',
    bullets: [['🤝', 'Сначала успокой'], ['🔍', 'Потом объясняй'], ['⚡', 'Не дави']],
    alarm: true,
    hello: null,
    steps: [
      { target: 'phone', objective: 'Ответь на звонок', run: 'brief' },
      { target: 'monitor', objective: 'Открой дело на мониторе', run: 'call' },
    ],
  },
  {
    n: 5, id: 'trace', title: 'След денег', day: 'Пятница', time: '03:40', sky: 'night',
    skill: 'Расследование', icon: '🧵',
    goal: 'Пройди по цепочке переводов и найди организатора',
    bullets: [['💸', 'Следи за деньгами'], ['✂️', 'Найди дробление'], ['📱', 'Вычисли устройство']],
    alarm: false,
    hello: null,
    steps: [
      { target: 'board', objective: 'Подойди к доске расследований', run: 'trace' },
      { target: 'window', objective: 'Подойди к окну', run: 'dawn' },
    ],
  },
];

// ─────────────────────────── Знания (коллекция карточек) ───────────────────────────
export const KNOWLEDGE = {
  k_fear: { icon: '😱', title: 'Запугивание', text: 'Страх отключает логику' },
  k_urgent: { icon: '⏱', title: 'Спешка', text: 'Банк никогда не торопит' },
  k_link: { icon: '🔗', title: 'Фейковая ссылка', text: 'Одна буква — и сайт чужой' },
  k_code: { icon: '🔑', title: 'Коды и пароли', text: 'Код из СМС — только для тебя' },
  k_callback: { icon: '📞', title: 'Перезвони сам', text: 'По номеру на обороте карты' },
  k_free: { icon: '🎁', title: 'Халява', text: 'Бесплатный сыр — приманка' },
  k_profile: { icon: '👤', title: 'Профиль клиента', text: 'Система знает привычки' },
  k_signals: { icon: '⚠️', title: 'Сигналы риска', text: 'Ночь, новое устройство, чужой город' },
  k_balance: { icon: '⚖️', title: 'Баланс', text: 'Лишняя блокировка — тоже ошибка' },
  k_rule: { icon: '⚙️', title: 'Антифрод-правило', text: 'Сигналы + порог = защита' },
  k_fp: { icon: '🙅', title: 'Ложное срабатывание', text: 'Строгое правило бьёт по честным' },
  k_data: { icon: '📈', title: 'Проверка на данных', text: 'Правило тестируют на прошлом' },
  k_safe: { icon: '🏦', title: '«Безопасный счёт»', text: 'Таких счетов не существует' },
  k_calm: { icon: '🤝', title: 'Сначала успокой', text: 'В панике доводы не слышат' },
  k_leak: { icon: '🗂', title: 'Утечки данных', text: 'Знает твой адрес ≠ банк' },
  k_drop: { icon: '💳', title: 'Дропы', text: 'Сдать карту = стать соучастником' },
  k_split: { icon: '✂️', title: 'Дробление', text: 'Суммы делят, чтобы обойти лимиты' },
  k_device: { icon: '📱', title: 'Цифровой след', text: 'Устройство выдаёт организатора' },
};

// ─────────────────────────── Смена 1: фишинг ───────────────────────────
// segments: [текст, id улики?]
export const MESSAGES = {
  m1: {
    channel: 'SMS', sender: 'BANK-INFO', senderSub: 'короткий номер', time: '10:02', fraud: true, reach: 1248,
    segments: [
      ['Ваша карта ЗАБЛОКИРОВАНА', 'f1'],
      ['. '],
      ['Разблокируйте за 2 часа', 'f2'],
      [' по ссылке: '],
      ['bank-securlty-help.top', 'f3'],
    ],
    flags: {
      f1: { k: 'k_fear', short: 'Пугают блокировкой' },
      f2: { k: 'k_urgent', short: 'Давят временем' },
      f3: { k: 'k_link', short: 'Фальшивый адрес', link: [['bank-secur'], ['l', 'l вместо i'], ['ty-help'], ['.top', 'не банковский домен']] },
    },
    verdict: 'Напугать → поторопить → увести на фейковый сайт',
  },
  m3: {
    channel: 'SMS', sender: 'BANK', senderSub: 'номер банка', time: '10:04', fraud: false,
    segments: [['Покупка 1 250 ₽, «Книжный дом». '], ['Баланс 8 430 ₽. '], ['Не вы? Позвоните по номеру на карте.']],
    flags: {},
    k: 'k_callback',
    verdict: 'Нет ссылок и просьб — обычное уведомление',
  },
  m2: {
    channel: 'Мессенджер', sender: 'Мама', senderSub: 'новый номер', time: '10:07', fraud: true, reach: 87,
    segments: [
      ['Это мама, '],
      ['у меня новый номер', 'f1'],
      ['. '],
      ['Срочно скинь 3 000 ₽', 'f2'],
      [' '],
      ['на карту подруги', 'f3'],
      ['. '],
      ['Звонить не могу', 'f4'],
    ],
    flags: {
      f1: { k: 'k_callback', short: 'Незнакомый номер' },
      f2: { k: 'k_urgent', short: 'Срочно и деньги' },
      f3: { short: 'Чужая карта' },
      f4: { k: 'k_callback', short: 'Избегает звонка' },
    },
    verdict: 'Фальшивый родственник. Позвони на старый номер',
  },
  m4: {
    channel: 'Мессенджер', sender: 'GameDrop 🎮', senderSub: 'канал', time: '10:11', fraud: true, reach: 3410,
    segments: [
      ['🔥 '],
      ['5 000 кристаллов бесплатно', 'f1'],
      ['! '],
      ['Осталось 3 места', 'f2'],
      ['. Войди на '],
      ['gamedrop-free.ru', 'f3'],
      [' и '],
      ['введи пароль от игры', 'f4'],
    ],
    flags: {
      f1: { k: 'k_free', short: 'Слишком щедро' },
      f2: { k: 'k_urgent', short: 'Искусственный дефицит' },
      f3: { k: 'k_link', short: 'Не сайт игры', link: [['gamedrop'], ['-free', 'приманка в адресе'], ['.ru']] },
      f4: { k: 'k_code', short: 'Кража аккаунта' },
    },
    verdict: 'Угон игрового аккаунта — частая ловушка для подростков',
  },
  m5: {
    channel: 'Почта', sender: 'Портал выплат', senderSub: 'gosuslugi-vyplaty.top', time: '10:15', fraud: true, reach: 2905,
    segments: [
      ['Вам положена '],
      ['выплата 12 800 ₽', 'f1'],
      ['. '],
      ['Введите номер карты и CVV', 'f2'],
      [' на '],
      ['gosuslugi-vyplaty.top', 'f3'],
    ],
    flags: {
      f1: { k: 'k_free', short: 'Деньги из ниоткуда' },
      f2: { k: 'k_code', short: 'CVV нужен, чтобы списать' },
      f3: { k: 'k_link', short: 'Поддельный домен', link: [['gosuslugi'], ['-vyplaty', 'лишнее слово'], ['.top', 'не госсайт']] },
    },
    verdict: 'Для выплаты CVV не нужен. Он нужен, чтобы украсть',
  },
  m6: {
    channel: 'SMS', sender: 'BANK', senderSub: 'номер банка', time: '10:18', fraud: false,
    segments: [['Код для входа: 4721. '], ['Никому его не сообщайте.']],
    flags: {},
    k: 'k_code',
    verdict: 'Обычный код. Опасно — продиктовать его по телефону',
  },
};

// ─────────────────────────── Смена 2: поток операций ───────────────────────────
// sig: amount, city, night, device, to, call. «x» — во сколько раз сумма больше обычной.
export const SIGNALS = {
  amount: { icon: '💰', label: 'Крупная сумма' },
  city: { icon: '📍', label: 'Чужой город' },
  night: { icon: '🌙', label: 'Ночь' },
  device: { icon: '📱', label: 'Новое устройство' },
  to: { icon: '👤', label: 'Новый получатель' },
  call: { icon: '📞', label: 'Звонок во время перевода' },
};

export const FLOW_CARDS = [
  { name: 'Ольга', age: 34, amount: 1240, what: 'продукты', city: 'Ростов', time: '14:41', device: 'своё', to: 'магазин', sig: [], fraud: false },
  { name: 'Артём', age: 19, amount: 48000, x: 20, what: 'перевод', city: 'Ростов', time: '03:12', device: 'новое', to: 'новый человек', sig: ['amount', 'night', 'device', 'to'], fraud: true },
  { name: 'Светлана', age: 45, amount: 18500, what: 'отель', city: 'Сочи', time: '12:05', device: 'своё', to: 'отель', sig: ['city'], fraud: false },
  { name: 'Николай', age: 67, amount: 95000, x: 30, what: 'перевод', city: 'Ростов', time: '11:20', device: 'своё', to: 'новый человек', sig: ['amount', 'to'], fraud: true },
  { name: 'Даша', age: 16, amount: 299, what: 'игра', city: 'Ростов', time: '21:30', device: 'своё', to: 'магазин', sig: [], fraud: false },
  { name: 'Сергей', age: 52, amount: 3990, what: 'электроника', city: 'Новосибирск', time: '04:20', device: 'новое', to: 'магазин', sig: ['city', 'night', 'device'], fraud: true },
  { name: 'Марина', age: 29, amount: 64000, x: 15, what: 'ноутбук', city: 'Ростов', time: '16:10', device: 'своё', to: 'магазин', sig: ['amount'], fraud: false },
  { name: 'Тимур', age: 23, amount: 49500, x: 25, what: '5 переводов за минуту', city: 'Ростов', time: '15:02', device: 'новое', to: 'новый человек', sig: ['amount', 'device', 'to'], fraud: true },
  { name: 'Валерий', age: 58, amount: 5400, what: 'ЖКХ', city: 'Ростов', time: '23:40', device: 'своё', to: 'ЖКХ', sig: ['night'], fraud: false },
  { name: 'Зоя', age: 74, amount: 120000, x: 40, what: 'перевод', city: 'Ростов', time: '10:30', device: 'своё', to: 'новый человек', call: true, sig: ['amount', 'to', 'call'], fraud: true },
  { name: 'Пётр', age: 40, amount: 640, what: 'такси', city: 'Краснодар', time: '14:10', device: 'своё', to: 'такси', sig: ['city'], fraud: false },
  { name: 'Кристина', age: 31, amount: 30000, x: 12, what: 'перевод', city: 'Ростов', time: '13:00', device: 'новое', to: 'новый человек', sig: ['amount', 'device', 'to'], fraud: true },
];

// ─────────────────────────── Смена 3: антифрод-правило ───────────────────────────
// «Вчерашние» операции: наборы сигналов. Честные клиенты тоже бывают ночью и в поездках.
export const RULE_DATA = {
  fraud: [
    ['amount', 'to', 'call'], ['amount', 'to', 'device'], ['device', 'night', 'city'], ['amount', 'to', 'call'], ['to', 'device'],
    ['amount', 'to'], ['to', 'call'], ['device', 'city', 'night'], ['amount', 'device', 'to'], ['to', 'call', 'amount'],
  ],
  honest: [
    ...Array(12).fill([]),
    ['city'], ['city'], ['city'], ['city'],
    ['night'], ['night'], ['night'], ['night'],
    ['amount'], ['amount'], ['amount'],
    ['device'], ['device'],
    ['city', 'night'], ['city', 'night'],
    ['to'],
    ['amount', 'device'],
    ['to', 'night'],
  ],
};

// ─────────────────────────── Смена 4: звонок ───────────────────────────
export const CLIENT = {
  name: 'Валентина Петровна Ковалёва',
  short: 'Валентина Петровна',
  age: 72,
  amount: 340000,
  card: '•• 4417',
  recipient: 'Дмитрий К.',
  sig: ['amount', 'to', 'call'],
};

export const EVIDENCE = {
  ev_drop: { icon: '💳', action: 'Карта получателя', result: '3 дня от роду · 14 чужих переводов' },
  ev_spoof: { icon: '📵', action: 'Номер «майора»', result: 'Подменён · звонок через интернет' },
  ev_story: { icon: '🎓', action: 'История клиентки', result: 'Сегодня закрыт вклад «На учёбу Маше»' },
};

export const BRIEF = [
  'Сработало правило: пенсионерка, 72 года, переводит 340 тысяч.',
  'Похоже на «безопасный счёт». Проверь дело и звони. Не дави.',
];

// Теги: calm — поддержка, logic — довод, evidence — улика, pressure — напор.
export const CALL = {
  start: 'c1',
  nodes: {
    c1: {
      lines: [{ who: 'gran', emo: 'worried', text: 'Алло? Кто это? Мне некогда!' }],
      choices: [
        { tag: 'calm', text: 'Здравствуйте! Я {name}, безопасность вашего банка. Вы в порядке?', trust: 10, fear: -5, reply: { emo: 'worried', text: 'Из банка?.. Мне говорили, что вы позвоните…' }, next: 'c2' },
        { tag: 'pressure', text: 'Срочно отмените перевод! Вас обманывают!', trust: -15, fear: 15, reply: { emo: 'angry', text: 'Не кричите! Я знаю, что делаю!' }, next: 'c2' },
        { tag: 'logic', trap: true, text: 'Продиктуйте код из СМС — я отменю операцию.', trust: -25, fear: 10, reply: { emo: 'angry', text: 'Код?! Код просят только мошенники!' }, lesson: 'k_code', next: 'c2' },
      ],
    },
    c2: {
      lines: [{ who: 'gran', emo: 'scared', text: 'Майор из ФСБ сказал: в банке предатель. Деньги надо спрятать на безопасный счёт.' }],
      choices: [
        { tag: 'calm', text: 'Понимаю, вам страшно. Давайте спокойно разберёмся.', trust: 12, fear: -15, reply: { emo: 'worried', text: 'Страшно… Я ведь шесть лет копила.' }, next: 'c3' },
        { tag: 'logic', k: 'k_safe', text: 'Безопасных счетов не бывает. Ни банк, ни ФСБ так не делают.', trust: 14, fear: -5, reply: { emo: 'worried', text: 'Но номер у него московский!' }, next: 'c3' },
        { tag: 'pressure', text: 'Ваш майор — мошенник, это же очевидно!', trust: -15, fear: 10, reply: { emo: 'angry', text: 'Вы меня за дурочку держите?!' }, next: 'c3' },
      ],
    },
    c3: {
      lines: [{ who: 'gran', emo: 'worried', text: 'Он звонит с московского номера. Всё официально!' }],
      choices: [
        { tag: 'evidence', ev: 'ev_spoof', text: 'Мы проверили: номер подменён, звонят через интернет.', trust: 18, fear: -5, reply: { emo: 'surprised', text: 'Подменён?.. Так разве можно?' }, next: 'hold' },
        { tag: 'logic', text: 'Номер на экране легко подделать.', trust: 6, fear: 0, reply: { emo: 'worried', text: 'Он и удостоверение показывал…' }, next: 'hold' },
        { tag: 'pressure', text: 'Вы что, новости не смотрите?', trust: -10, fear: 5, reply: { emo: 'angry', text: 'Смотрю! Там говорят, мошенники и в банках есть!' }, next: 'hold' },
      ],
    },
    hold: {
      type: 'hold',
      lines: [{ who: 'gran', emo: 'scared', text: 'Ой, майор на второй линии… Подождите.' }],
      holdMs: 4200,
      fear: 25,
      after: [{ who: 'gran', emo: 'panic', text: 'Он говорит: не переведу — на внучку Машу оформят кредит!' }],
      next: 'c4',
    },
    c4: {
      lines: [],
      choices: [
        { tag: 'calm', text: 'С Машей всё хорошо. Напишите ей прямо сейчас.', trust: 12, fear: -15, reply: { emo: 'worried', text: 'Да… сейчас напишу.' }, next: 'masha' },
        { tag: 'logic', text: 'Кредит без паспорта Маши не оформить.', trust: 8, fear: -5, reply: { emo: 'scared', text: 'Но ФСБ всё может…' }, next: 'c5' },
        { tag: 'pressure', text: 'Бросайте трубку немедленно!', trust: -12, fear: 15, reply: { emo: 'panic', text: 'Не могу! Он сказал — всё пропадёт!' }, next: 'c5' },
      ],
    },
    masha: {
      type: 'chat',
      chat: [
        { from: 'gran', text: 'Маша, ты как?' },
        { from: 'masha', text: 'бабуль, я дома, всё ок 😊 а что?' },
        { from: 'gran', text: 'Ничего, спи.' },
      ],
      trust: 10,
      fear: -20,
      after: [{ who: 'gran', emo: 'worried', text: 'Она дома… Значит, он врал?' }],
      next: 'c5',
    },
    c5: {
      lines: [{ who: 'gran', emo: 'worried', text: 'А почему я должна верить вам, а не ему?' }],
      choices: [
        { tag: 'logic', k: 'k_callback', text: 'Не верьте никому. Положите трубку и позвоните в банк сами.', trust: 22, fear: -5, reply: { emo: 'surprised', text: 'Сама позвонить?.. А он говорил — нельзя.' }, next: 'c6' },
        { tag: 'evidence', ev: 'ev_drop', text: 'Деньги уходят на чужую карту. Туда уже перевели 14 человек.', trust: 18, fear: 0, reply: { emo: 'surprised', text: 'Четырнадцать?.. Таких же, как я?' }, next: 'c6' },
        { tag: 'logic', text: 'Я назову номер вашего договора.', trust: -6, fear: 5, reply: { emo: 'scared', text: 'Майор тоже всё про меня знал…' }, lesson: 'k_leak', next: 'c6' },
      ],
    },
    c6: {
      lines: [{ who: 'gran', emo: 'panic', text: 'Он снова звонит! Осталась минута, палец на кнопке. Что делать?!' }],
      second: true,
      confirmScreen: true,
      choices: [
        { tag: 'logic', k: 'k_urgent', text: 'Это спешка. Банк никогда не торопит. Не нажимайте.', trust: 20, fear: -10, next: 'final' },
        { tag: 'evidence', ev: 'ev_story', text: 'Это деньги Маши на учёбу. Не отдавайте их.', trust: 22, fear: -15, next: 'final' },
        { tag: 'calm', text: 'Вдохните. Положите телефон на стол.', trust: 14, fear: -15, next: 'final' },
        { tag: 'pressure', text: 'Делайте что хотите.', trust: -20, fear: 10, next: 'final' },
      ],
    },
  },
  win: [
    { who: 'gran', emo: 'cry', text: 'Я сбросила его… Руки трясутся.' },
    { who: 'gran', emo: 'cry', text: 'Это же Машины деньги. Спасибо, деточка.' },
  ],
  loseTrust: [{ who: 'gran', emo: 'angry', text: 'Хватит! Вы с ними заодно!' }],
  loseTime: [{ who: 'gran', emo: 'scared', text: 'Он сбросил… А где мои деньги?' }],
  loseFinal: [{ who: 'gran', emo: 'worried', text: 'Простите… Я верю майору.' }],
};

// ─────────────────────────── Смена 5: расследование ───────────────────────────
// Выписки зависят от исхода звонка в смене 4.
export function buildTrace(clientLost) {
  const dimaOut = clientLost ? 583000 : 243000;
  const split = clientLost ? 272000 : 249000;
  const splits = clientLost ? 4 : 3;

  const dimaTx = [
    { t: '21:10', a: 85000, who: 'Галина М., Таганрог' },
    { t: '21:14', a: 47000, who: 'Пётр Н., Азов' },
    { t: '21:31', a: 120000, who: 'Людмила В., Батайск' },
  ];
  if (clientLost) dimaTx.push({ t: '00:41', a: 340000, who: 'Валентина К., Ростов' });
  dimaTx.push(
    { t: clientLost ? '00:44' : '21:40', a: -350, who: 'Кафе «Пончик»', why: 'Это просто пончик 🍩' },
    { t: clientLost ? '00:52' : '21:52', a: -dimaOut, who: 'Карта •• 9051', go: 'transit' },
    { t: clientLost ? '00:55' : '21:55', a: -9000, who: 'Снятие наличных', why: 'Это «зарплата» Димы. Ищи крупную сумму' },
  );

  const transitTx = [
    { t: clientLost ? '00:52' : '21:52', a: dimaOut, who: 'Дмитрий К.' },
    { t: '21:58', a: 198000, who: 'Алина Р.' },
    { t: '22:07', a: 311000, who: 'Кирилл Т.' },
  ];
  const times = clientLost ? ['00:58', '00:59', '01:01', '01:03'] : ['22:15', '22:16', '22:18'];
  for (let i = 0; i < splits; i++) transitTx.push({ t: times[i], a: -split, who: 'Криптообменник #7781', split: true });
  transitTx.push(
    { t: clientLost ? '01:05' : '22:21', a: -990, who: 'VPN-сервис', why: 'Мелочь. Ищи одинаковые крупные суммы' },
    { t: clientLost ? '01:06' : '22:25', a: -1500, who: 'Такси', why: 'Мелочь. Ищи одинаковые крупные суммы' },
  );

  return {
    frozen: split * splits,
    victims: clientLost ? 24 : 23,
    nodes: {
      victim: { kind: 'victim', title: 'Валентина П.', sub: '72 года', x: 11, y: 18, visible: true },
      others: { kind: 'victims', title: 'Потерпевшие', sub: `ещё ${clientLost ? 23 : 22} человека`, x: 11, y: 74, visible: false },
      dima: {
        kind: 'drop', title: 'Дмитрий К.', sub: '17 лет', x: 35, y: 18, visible: true,
        info: '💳 Карте 3 дня · 14 чужих переводов',
        tx: dimaTx,
        devices: ['Redmi · #3C81', 'Galaxy · #A7F3', 'iPad · #77B2'],
      },
      alina: { kind: 'drop', title: 'Алина Р.', sub: '18 лет', x: 35, y: 50, visible: false, info: '💳 Карте 5 дней', devices: ['iPhone · #E019', 'Galaxy · #A7F3', 'Honor · #B4D2'] },
      kirill: { kind: 'drop', title: 'Кирилл Т.', sub: '19 лет', x: 35, y: 82, visible: false, info: '💳 «Работа с картой, 5000 в день»', devices: ['Poco · #09AF', 'Galaxy · #A7F3', 'iPad · #77B3'] },
      transit: { kind: 'transit', title: 'Карта •• 9051', sub: 'транзитная', x: 60, y: 50, visible: false, info: '🔀 Сюда стекаются деньги дропов', tx: transitTx },
      exchange: { kind: 'exchange', title: 'Обменник', sub: 'кошелёк #7781', x: 85, y: 50, visible: false, info: '🔒 Владелец скрыт. Но есть цифровой след' },
      boss: { kind: 'boss', title: 'Куратор', sub: 'устройство #A7F3', x: 85, y: 16, visible: false, info: '📍 Последний вход: Ростов, 00:31' },
    },
    links: [{ from: 'victim', to: 'dima', kind: clientLost ? 'money' : 'cancelled', label: clientLost ? '340 тыс.' : 'отменён', visible: true }],
    answerDevice: '#A7F3',
  };
}

// ─────────────────────────── Финал главы ───────────────────────────
export const FINALE = {
  masha: {
    saved: ['Здравствуйте! Это Маша, внучка Валентины Петровны.', 'Бабушка всё рассказала. Спасибо, что не дали её обмануть 💚', 'Я поступлю, обещаю!'],
    frozen: ['Здравствуйте! Это Маша, внучка Валентины Петровны.', 'Бабушкины деньги успели заморозить. Спасибо, что не сдались!'],
    lost: ['Здравствуйте! Это Маша, внучка Валентины Петровны.', 'Денег, наверное, не вернуть. Но бабушка цела — это главное.', 'Спасибо, что пытались.'],
    dima: ['И ещё… «Дмитрий К.» — это Дима из моего класса 😶', 'Ему обещали 5000 ₽ «за карту». Он не знал, что это преступление.', 'Завтра расскажу всему классу.'],
  },
};

export const PROFESSION = {
  name: 'Специалист по финансовой безопасности',
  rows: [
    ['🎓', 'Где учиться', 'Экономическая или информационная безопасность — ЮФУ, РГЭУ (РИНХ), ДГТУ'],
    ['📚', 'Предметы', 'Математика, информатика, обществознание'],
    ['🧠', 'Качества', 'Внимательность, логика, умение говорить с людьми'],
  ],
};
