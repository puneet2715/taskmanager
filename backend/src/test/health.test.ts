import request from 'supertest';
import app from '../index';

describe('Health Check Endpoint', () => {
  it('should return health status without authentication', async () => {
    const response = await request(app)
      .get('/health')
      .expect('Content-Type', /json/);

    expect(response.status).toBeGreaterThanOrEqual(200);
    expect(response.status).toBeLessThan(600);
    
    expect(response.body).toHaveProperty('status');
    expect(response.body).toHaveProperty('timestamp');
    expect(response.body).toHaveProperty('uptime');
    expect(response.body).toHaveProperty('version');
    expect(response.body).toHaveProperty('services');
    
    expect(response.body.services).toHaveProperty('database');
    expect(response.body.services).toHaveProperty('redis');
    expect(response.body.services).toHaveProperty('socketio');
    
    expect(typeof response.body.uptime).toBe('number');
    expect(typeof response.body.timestamp).toBe('string');
    expect(response.body.version).toBe('1.0.0');
  });

  it('should return detailed service status information', async () => {
    const response = await request(app)
      .get('/health');

    const { services } = response.body;
    
    // Database status should be one of the expected values
    expect(['connected', 'disconnected', 'connecting', 'disconnecting', 'error']).toContain(services.database);
    
    // Redis status should indicate configuration state
    expect(['not_configured', 'configured_not_connected', 'connected', 'error']).toContain(services.redis);
    
    // Socket.io status should be one of the expected values
    expect(['active', 'inactive', 'error']).toContain(services.socketio);
  });

  it('should be publicly accessible (no authentication required)', async () => {
    // This test ensures no authentication middleware is applied to /health
    const response = await request(app)
      .get('/health');
    
    // Should not return 401 Unauthorized
    expect(response.status).not.toBe(401);
    
    // Should return a valid health response
    expect(response.body).toHaveProperty('status');
  });
});