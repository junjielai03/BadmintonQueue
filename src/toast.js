let toastT;

export const toast = m => {
  const t = document.getElementById('toast');
  t.textContent = m;
  t.className = 'show';
  clearTimeout(toastT);
  toastT = setTimeout(() => t.className = '', 3500);
};
