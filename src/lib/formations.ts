export interface Formation {
  id: string;
  name: string;
  getPositions: (n: number) => Array<{ x: number; y: number }>;
}

/** 한 줄 균등 배치 헬퍼 */
const row = (count: number, y: number, margin = 12) => {
  if (count <= 0) return [];
  if (count === 1) return [{ x: 50, y }];
  return Array.from({ length: count }, (_, i) => ({
    x: margin + (i / (count - 1)) * (100 - 2 * margin),
    y,
  }));
};

export const FORMATIONS: Formation[] = [
  // 1. 일자형
  {
    id: 'single-line',
    name: '일자형',
    getPositions: (n) => row(n, 50),
  },

  // 2. 이열횡대
  {
    id: 'two-rows',
    name: '이열횡대',
    getPositions: (n) => {
      const r1 = Math.ceil(n / 2);
      return [...row(r1, 33), ...row(n - r1, 67)];
    },
  },

  // 3. 삼열횡대
  {
    id: 'three-rows',
    name: '삼열횡대',
    getPositions: (n) => {
      const r1 = Math.round(n / 3);
      const r2 = Math.round((n - r1) / 2);
      const r3 = n - r1 - r2;
      return [...row(r1, 22), ...row(r2, 50), ...row(r3, 78)];
    },
  },

  // 4. V자형 (리더 앞, 양날개 뒤로)
  {
    id: 'v-shape',
    name: 'V자형',
    getPositions: (n) => {
      if (n === 1) return [{ x: 50, y: 70 }];
      const pts: Array<{ x: number; y: number }> = [{ x: 50, y: 72 }];
      const wings = n - 1;
      for (let i = 0; i < wings; i++) {
        const rank = Math.floor(i / 2) + 1;
        const total = Math.ceil(wings / 2);
        const xOff = (rank / total) * 33;
        const yOff = (rank / total) * 38;
        if (i % 2 === 0) pts.push({ x: 50 - xOff, y: 72 - yOff });
        else             pts.push({ x: 50 + xOff, y: 72 - yOff });
      }
      return pts;
    },
  },

  // 5. 역V자형 (리더 뒤, 양날개 앞으로)
  {
    id: 'inv-v',
    name: '역V자형',
    getPositions: (n) => {
      if (n === 1) return [{ x: 50, y: 28 }];
      const pts: Array<{ x: number; y: number }> = [{ x: 50, y: 26 }];
      const wings = n - 1;
      for (let i = 0; i < wings; i++) {
        const rank = Math.floor(i / 2) + 1;
        const total = Math.ceil(wings / 2);
        const xOff = (rank / total) * 33;
        const yOff = (rank / total) * 42;
        if (i % 2 === 0) pts.push({ x: 50 - xOff, y: 26 + yOff });
        else             pts.push({ x: 50 + xOff, y: 26 + yOff });
      }
      return pts;
    },
  },

  // 6. 원형
  {
    id: 'circle',
    name: '원형',
    getPositions: (n) => {
      if (n === 1) return [{ x: 50, y: 50 }];
      return Array.from({ length: n }, (_, i) => ({
        x: 50 + 33 * Math.cos((2 * Math.PI * i / n) - Math.PI / 2),
        y: 50 + 33 * Math.sin((2 * Math.PI * i / n) - Math.PI / 2),
      }));
    },
  },

  // 7. 다이아몬드
  {
    id: 'diamond',
    name: '다이아몬드',
    getPositions: (n) => {
      const corners = [
        { x: 50, y: 16 },
        { x: 84, y: 50 },
        { x: 50, y: 84 },
        { x: 16, y: 50 },
      ];
      if (n <= 4) return corners.slice(0, n);
      const inner = n - 4;
      const innerPts = Array.from({ length: inner }, (_, i) => ({
        x: 50 + 19 * Math.cos((2 * Math.PI * i / inner) - Math.PI / 2),
        y: 50 + 19 * Math.sin((2 * Math.PI * i / inner) - Math.PI / 2),
      }));
      return [...corners, ...innerPts];
    },
  },

  // 8. 대각선
  {
    id: 'diagonal',
    name: '대각선',
    getPositions: (n) =>
      Array.from({ length: n }, (_, i) => ({
        x: 14 + i * 72 / Math.max(n - 1, 1),
        y: 78 - i * 56 / Math.max(n - 1, 1),
      })),
  },

  // 9. 지그재그
  {
    id: 'zigzag',
    name: '지그재그',
    getPositions: (n) =>
      Array.from({ length: n }, (_, i) => ({
        x: (i + 1) * 100 / (n + 1),
        y: i % 2 === 0 ? 33 : 67,
      })),
  },

  // 10. 삼각형 (앞 1명 → 뒤로 갈수록 행 증가)
  {
    id: 'pyramid',
    name: '삼각형',
    getPositions: (n) => {
      const rows: number[] = [];
      let remaining = n;
      let size = 1;
      while (remaining > 0) {
        const s = Math.min(size, remaining);
        rows.push(s);
        remaining -= s;
        size++;
      }
      const totalRows = rows.length;
      return rows.flatMap((count, rowIdx) => {
        const y = 75 - (rowIdx / Math.max(totalRows - 1, 1)) * 55;
        return Array.from({ length: count }, (_, colIdx) => ({
          x: count === 1 ? 50 : 18 + (colIdx / (count - 1)) * 64,
          y,
        }));
      });
    },
  },
];
