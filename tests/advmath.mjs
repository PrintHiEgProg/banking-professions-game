import { ADVISOR_SHIFTS, monthlyFree, forecast, income, spend } from '../game/js/data/advisor.js';
for (const [n, cfg] of Object.entries(ADVISOR_SHIFTS)) {
  const all = {}; const waste = {}; const wasteHalfFun = {};
  for (const e of cfg.expenses) {
    if (e.kind !== 'need') all[e.id] = 'closed';
    if (e.kind === 'waste') { waste[e.id] = 'closed'; wasteHalfFun[e.id] = 'closed'; }
    if (e.kind === 'fun') wasteHalfFun[e.id] = 'half';
  }
  const fmt = (r) => `${r.months}m (${Math.round(r.total)}; int ${Math.round(r.interest)})`;
  console.log(`\n#${n} ${cfg.goal.title} price=${cfg.goal.price} deadline=${cfg.goal.months} income=${income(cfg)} spend=${spend(cfg)}`);
  console.log(` free: none=${monthlyFree(cfg)} waste=${monthlyFree(cfg, waste)} waste+halfFun=${monthlyFree(cfg, wasteHalfFun)} all=${monthlyFree(cfg, all)}`);
  for (const product of cfg.products) {
    for (const cushion of cfg.cushion ? cfg.cushion.steps : [0]) {
      console.log(`  ${product} cushion=${cushion}: waste ${fmt(forecast(cfg, { cuts: waste, product, cushion }))} | w+hf ${fmt(forecast(cfg, { cuts: wasteHalfFun, product, cushion }))} | all ${fmt(forecast(cfg, { cuts: all, product, cushion }))}`);
    }
  }
}
