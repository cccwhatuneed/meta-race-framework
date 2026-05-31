class ChampionStorage {
  constructor(nodes) {
    this.nodes = nodes;
    this.champion = null;
  }
  
  async write(key, value) {
    while (true) {
      const target = this.champion || this.nodes[Math.floor(Math.random() * this.nodes.length)];
      try {
        await target.client.set(key, JSON.stringify(value));
        this.champion = target;
        return;
      } catch {
        this.champion = null;
      }
    }
  }
  
  async read(key) {
    if (!this.champion) return null;
    try {
      return await this.champion.client.get(key);
    } catch {
      this.champion = null;
      return null;
    }
  }
}