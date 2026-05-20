/**
 * @aitools/cluster - Main Tests
 */

import { Cluster } from '../src/index';

describe('@aitools/cluster', () => {
  it('should export Cluster', () => {
    expect(Cluster).toBeDefined();
  });

  it('should create cluster instance', () => {
    const cluster = new Cluster({ poolSize: 10 });
    expect(cluster).toBeInstanceOf(Cluster);
  });
});
