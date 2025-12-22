/**
 * 🎯 GATEWAY LAUNCHER - Ready-to-deploy modular intelligence gateway
 */

import ModularOmniGateway from './modular-omni-gateway';

async function main() {
  try {
    const gateway = new ModularOmniGateway({
      port: parseInt(process.env.PORT || '3000'),
      cors: {
        origin: [
          'http://localhost:3000',
          'https://*.hostinger.com',
          'https://hostinger-horizons-ai.com',
          process.env.FRONTEND_URL || 'http://localhost:3000'
        ],
        credentials: true
      },
      rateLimit: {
        windowMs: 15 * 60 * 1000, // 15 minutes
        max: parseInt(process.env.RATE_LIMIT || '1000')
      },
      mcp: {
        enabled: process.env.MCP_ENABLED !== 'false',
        serverPort: parseInt(process.env.MCP_PORT || '3001')
      }
    });

    // Graceful shutdown
    process.on('SIGTERM', async () => {
      console.log('🛑 Received SIGTERM, shutting down gracefully...');
      await gateway.stop();
      process.exit(0);
    });

    process.on('SIGINT', async () => {
      console.log('🛑 Received SIGINT, shutting down gracefully...');
      await gateway.stop();
      process.exit(0);
    });

    await gateway.start();
  } catch (error) {
    console.error('❌ Failed to start gateway:', error);
    process.exit(1);
  }
}

// Launch if run directly
if (require.main === module) {
  main();
}

export default main;