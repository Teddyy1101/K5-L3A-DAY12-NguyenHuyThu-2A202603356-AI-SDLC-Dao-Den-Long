const radians = Math.PI / 180;

export function polarPoints(radius, count, interval, start = 0, x = 0, y = 0) {
  return Array.from({ length: count }, (_, i) => {
    const angle = (start + i * interval) * radians;
    return [x + radius * Math.cos(angle), y, radius * Math.sin(angle)];
  });
}

export const nights = {
  1: {
    name: 'Đảo Bến', radius: 40,
    advice: 'Đi theo những đốm sáng và thắp đèn để có chỗ nghỉ chân.',
    lanterns: [[0, 0, 25], [23.8, 0, 7.7], [14.7, 0, -20.2], [-14.7, 0, -20.2], [-23.8, 0, 7.7]],
    motes: [...polarPoints(12, 8, 45), ...polarPoints(33, 16, 22.5)],
    mist: polarPoints(37, 12, 30, 15),
    shadesEvery: 8, shadeLimit: 6, pads: [], charms: [], minShadeDistance: 15,
  },
  2: {
    name: 'Đôi Đảo Tre', radius: 28,
    advice: 'Bục nhảy đưa cháu sang đảo bên kia. Giữ chặt đom đóm khi Gió Lạc đến.',
    lanterns: [[0, 0, 20], [17, 0, -10], [-17, 0, -10], [70, 0, 20], [87, 0, -10], [53, 0, -10]],
    motes: [0, 70].flatMap((x) => [...polarPoints(10, 4, 90, 0, x), ...polarPoints(22, 8, 45, 0, x)]),
    mist: [0, 70].flatMap((x) => polarPoints(26, 8, 45, 22.5, x)),
    shadesEvery: 7, shadeLimit: 8,
    pads: [{ pos: [20, 0, 18], target: [70, 0, 0], speed: 24, up: 14 },
      { pos: [50, 0, -18], target: [0, 0, 0], speed: 24, up: 14 }],
    charms: [[35, 0, 0]],
  },
  3: {
    name: 'Đảo Tháp Chuông', radius: 45,
    advice: 'Dùng dốc và bục nhảy để lên tháp. Lá bay báo hiệu gió lớn sắp tới.',
    lanterns: [[0, 6, 6], [18, 3, 10], [-18, 3, 10], [35, 0, -10], [-35, 0, -10], [20, 0, -35], [-20, 0, -35]],
    motes: [...polarPoints(34, 18, 20), ...polarPoints(18, 8, 20, 20, 0, 3), ...polarPoints(5, 4, 90, 45, 0, 6)],
    mist: polarPoints(43, 16, 22.5),
    shadesEvery: 6, shadeLimit: 10,
    pads: [{ pos: [0, 3, 13], target: [0, 0, 0], speed: 8, up: 12 }],
    charms: [[30, 0, 25], [-30, 0, 25]],
  },
};

export function floorAt(night, x, z, maxY = Infinity) {
  const radius = Math.hypot(x, z);
  if (night === 2) {
    const bridge = x >= 26 && x <= 44 && Math.abs(z) <= 2;
    return bridge || radius <= 28 || Math.hypot(x - 70, z) <= 28 ? 0 : -Infinity;
  }
  if (radius > nights[night].radius) return -Infinity;
  if (night === 1) return 0;
  if (radius <= 8 && maxY >= 6) return 6;
  if (z > 0 && radius >= 12 && radius <= 24 && maxY >= 3) return 3;
  for (const angle of [30 * radians, 150 * radians]) {
    const along = x * Math.cos(angle) + z * Math.sin(angle);
    const across = -x * Math.sin(angle) + z * Math.cos(angle);
    const rise = (30 - along) / 2;
    if (along >= 24 && along <= 30 && Math.abs(across) <= 1.5 && rise <= maxY) return rise;
  }
  return 0;
}
