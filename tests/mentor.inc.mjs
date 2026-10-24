// Общий помощник тестов: дождаться приветствия наставника в холле и закрыть его, как игрок
export async function dismissMentor(page, shotPath = null) {
  for (let i = 0; i < 60; i++) {
    const st = await page.evaluate(() => {
      const b = document.querySelector('.panel.brief.mentor .btn.primary');
      return b ? (b.classList.contains('hidden') ? 'typing' : 'ready') : 'none';
    });
    if (st === 'ready') {
      if (shotPath) await page.screenshot({ path: shotPath });
      await page.click('.panel.brief.mentor .btn.primary');
      await page.waitForTimeout(1600);
      return true;
    }
    if (st === 'typing') await page.click('.panel.brief.mentor .brief-lines').catch(() => {});
    await page.waitForTimeout(st === 'none' ? 200 : 260);
  }
  return false;
}
