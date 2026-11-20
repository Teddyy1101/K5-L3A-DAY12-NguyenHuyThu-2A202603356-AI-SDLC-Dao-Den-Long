export const actions=[
  ['up','Tiến','w','arrowup'],['down','Lùi','s','arrowdown'],
  ['left','Sang trái','a','arrowleft'],['right','Sang phải','d','arrowright'],
  ['jump','Nhảy',' '],['dash','Lướt','shift'],['interact','Tương tác','e'],
  ['pulse','Tỏa sáng','q'],['pause','Tạm dừng','p','escape'],
  ['cameraLeft','Xoay trái','j'],['cameraRight','Xoay phải','l'],['wood','Mộc Độn','1'],['meteor','Mưa sao băng','2'],['ice','Phép băng','3'],
];

export const defaultBindings=Object.fromEntries(actions.map(([action,,key])=>[action,key]));
export const keyName=key=>({' ':'Space',arrowup:'↑',arrowdown:'↓',arrowleft:'←',arrowright:'→',escape:'Esc',shift:'Shift'}[key] ?? key.toUpperCase());
export const usableKey=key=>key===' ' || /^[a-z0-9]$/.test(key) ||
  ['arrowup','arrowdown','arrowleft','arrowright','escape','shift','enter'].includes(key);

export function loadBindings(saved) {
  const bindings={...defaultBindings};
  if (!saved || actions.some(([action])=>typeof saved[action]!=='string'||!usableKey(saved[action]))) return bindings;
  if (new Set(actions.map(([action])=>saved[action])).size!==actions.length) return bindings;
  return Object.fromEntries(actions.map(([action])=>[action,saved[action]]));
}

export function actionForKey(bindings,key) {
  const direct=actions.find(([action])=>bindings[action]===key);
  if (direct) return direct[0];
  return actions.find(([action,,primary,alias])=>key===alias&&bindings[action]===primary)?.[0];
}
