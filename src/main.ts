export function main() {
  process.stdout.write("main");
}

export const sum = (...a: number[]) => a.reduce((acc, val) => acc + val, 0);
