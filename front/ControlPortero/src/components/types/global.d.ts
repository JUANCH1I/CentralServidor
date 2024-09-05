interface Window {
  loadPlayer: (config: { url: string; canvas: HTMLCanvasElement; audio?: boolean }) => void;
}