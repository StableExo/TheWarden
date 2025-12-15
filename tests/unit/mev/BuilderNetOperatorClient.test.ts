/**
 * BuilderNet Operator Client Tests
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { BuilderNetOperatorClient, OperatorAction, FileUploadTarget } from '../../../src/mev/builders';

// Mock fetch globally
global.fetch = vi.fn();

describe('BuilderNetOperatorClient', () => {
  let client: BuilderNetOperatorClient;
  const mockUrl = 'https://test-instance:3535';
  const mockPassword = 'test-password';

  beforeEach(() => {
    vi.clearAllMocks();
    client = new BuilderNetOperatorClient({
      instanceUrl: mockUrl,
      password: mockPassword,
      enableLogging: false,
    });
  });

  describe('Initialization', () => {
    it('should initialize with provided config', () => {
      expect(client.getInstanceUrl()).toBe(mockUrl);
    });

    it('should use default username if not provided', () => {
      const testClient = new BuilderNetOperatorClient({
        instanceUrl: mockUrl,
        password: mockPassword,
      });
      expect(testClient).toBeDefined();
    });

    it('should set instance URL', () => {
      const newUrl = 'https://new-instance:3535';
      client.setInstanceUrl(newUrl);
      expect(client.getInstanceUrl()).toBe(newUrl);
    });
  });

  describe('Liveness Check', () => {
    it('should return ok status on successful check', async () => {
      (global.fetch as any).mockResolvedValue({
        ok: true,
        text: async () => 'ok',
      });

      const result = await client.checkLiveness();
      
      expect(result.status).toBe('ok');
      expect(result.timestamp).toBeDefined();
      expect(global.fetch).toHaveBeenCalledWith(
        `${mockUrl}/livez`,
        expect.objectContaining({
          method: 'GET',
          headers: expect.objectContaining({
            Authorization: expect.stringContaining('Basic'),
          }),
        })
      );
    });

    it('should return error status on failed check', async () => {
      (global.fetch as any).mockResolvedValue({
        ok: false,
        status: 500,
      });

      const result = await client.checkLiveness();
      
      expect(result.status).toBe('error');
      expect(result.timestamp).toBeDefined();
    });

    it('should handle network errors', async () => {
      (global.fetch as any).mockRejectedValue(new Error('Network error'));

      const result = await client.checkLiveness();
      
      expect(result.status).toBe('error');
    });
  });

  describe('Get Logs', () => {
    it('should fetch logs successfully', async () => {
      const mockLogs = 'Log line 1\nLog line 2\nLog line 3';
      (global.fetch as any).mockResolvedValue({
        ok: true,
        text: async () => mockLogs,
      });

      const result = await client.getLogs();
      
      expect(result.logs).toBe(mockLogs);
      expect(result.lines).toBe(3);
      expect(result.timestamp).toBeDefined();
    });

    it('should fetch logs with tail parameter', async () => {
      (global.fetch as any).mockResolvedValue({
        ok: true,
        text: async () => 'Recent logs',
      });

      await client.getLogs(50);
      
      expect(global.fetch).toHaveBeenCalledWith(
        `${mockUrl}/logs?tail=50`,
        expect.any(Object)
      );
    });

    it('should throw error on failed log fetch', async () => {
      (global.fetch as any).mockResolvedValue({
        ok: false,
        status: 401,
        statusText: 'Unauthorized',
      });

      await expect(client.getLogs()).rejects.toThrow('HTTP 401: Unauthorized');
    });
  });

  describe('Execute Action', () => {
    it('should execute restart action successfully', async () => {
      (global.fetch as any).mockResolvedValue({
        ok: true,
        text: async () => 'Restart initiated',
      });

      const result = await client.executeAction(OperatorAction.RBUILDER_RESTART);
      
      expect(result.success).toBe(true);
      expect(result.action).toBe(OperatorAction.RBUILDER_RESTART);
      expect(result.message).toBe('Restart initiated');
      expect(global.fetch).toHaveBeenCalledWith(
        `${mockUrl}/api/v1/actions/${OperatorAction.RBUILDER_RESTART}`,
        expect.objectContaining({
          method: 'POST',
        })
      );
    });

    it('should handle action execution failure', async () => {
      (global.fetch as any).mockResolvedValue({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
      });

      const result = await client.executeAction(OperatorAction.RBUILDER_STOP);
      
      expect(result.success).toBe(false);
      expect(result.action).toBe(OperatorAction.RBUILDER_STOP);
      expect(result.message).toContain('500');
    });
  });

  describe('Convenience Methods', () => {
    beforeEach(() => {
      (global.fetch as any).mockResolvedValue({
        ok: true,
        text: async () => 'Action completed',
      });
    });

    it('should restart rbuilder', async () => {
      const result = await client.restartRbuilder();
      
      expect(result).toBe(true);
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('rbuilder_restart'),
        expect.any(Object)
      );
    });

    it('should stop rbuilder', async () => {
      const result = await client.stopRbuilder();
      
      expect(result).toBe(true);
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('rbuilder_stop'),
        expect.any(Object)
      );
    });

    it('should start rbuilder', async () => {
      const result = await client.startRbuilder();
      
      expect(result).toBe(true);
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('rbuilder_start'),
        expect.any(Object)
      );
    });
  });

  describe('Upload File', () => {
    it('should upload file successfully', async () => {
      (global.fetch as any).mockResolvedValue({
        ok: true,
      });

      const fileContent = JSON.stringify({ test: 'data' });
      const result = await client.uploadFile(
        FileUploadTarget.RBUILDER_BLOCKLIST,
        fileContent
      );
      
      expect(result).toBe(true);
      expect(global.fetch).toHaveBeenCalledWith(
        `${mockUrl}/api/v1/file-upload/${FileUploadTarget.RBUILDER_BLOCKLIST}`,
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Content-Type': 'application/octet-stream',
          }),
          body: fileContent,
        })
      );
    });

    it('should handle upload failure', async () => {
      (global.fetch as any).mockResolvedValue({
        ok: false,
        status: 500,
        statusText: 'Upload failed',
      });

      const result = await client.uploadFile(
        FileUploadTarget.RBUILDER_CONFIG,
        'config data'
      );
      
      expect(result).toBe(false);
    });
  });

  describe('Update Blocklist', () => {
    it('should update blocklist successfully', async () => {
      (global.fetch as any).mockResolvedValue({
        ok: true,
      });

      const blocklist = [
        '0x1111111111111111111111111111111111111111',
        '0x2222222222222222222222222222222222222222',
      ];
      
      const result = await client.updateBlocklist(blocklist);
      
      expect(result).toBe(true);
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('rbuilder_blocklist'),
        expect.objectContaining({
          body: expect.stringContaining('0x1111111111111111111111111111111111111111'),
        })
      );
    });
  });

  describe('Set Basic Auth', () => {
    it('should set basic auth for first time', async () => {
      (global.fetch as any).mockResolvedValue({
        ok: true,
      });

      const result = await client.setBasicAuth('new-password', false);
      
      expect(result).toBe(true);
      expect(global.fetch).toHaveBeenCalledWith(
        `${mockUrl}/api/v1/set-basic-auth`,
        expect.objectContaining({
          method: 'POST',
          body: 'new-password',
          headers: expect.not.objectContaining({
            Authorization: expect.anything(),
          }),
        })
      );
    });

    it('should update basic auth with old password', async () => {
      (global.fetch as any).mockResolvedValue({
        ok: true,
      });

      const result = await client.setBasicAuth('new-password', true);
      
      expect(result).toBe(true);
      expect(global.fetch).toHaveBeenCalledWith(
        `${mockUrl}/api/v1/set-basic-auth`,
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: expect.stringContaining('Basic'),
          }),
        })
      );
    });

    it('should handle auth update failure', async () => {
      (global.fetch as any).mockResolvedValue({
        ok: false,
        status: 401,
        statusText: 'Unauthorized',
      });

      const result = await client.setBasicAuth('new-password', true);
      
      expect(result).toBe(false);
    });
  });

  describe('Get Health Status', () => {
    it('should return comprehensive health status', async () => {
      // Mock liveness check
      (global.fetch as any)
        .mockResolvedValueOnce({
          ok: true,
          text: async () => 'ok',
        })
        // Mock logs fetch
        .mockResolvedValueOnce({
          ok: true,
          text: async () => 'Log line 1\nLog line 2',
        });

      const result = await client.getHealthStatus();
      
      expect(result.healthy).toBe(true);
      expect(result.liveness.status).toBe('ok');
      expect(result.recentLogs).toBeDefined();
      expect(result.recentLogs?.lines).toBe(2);
    });

    it('should handle unhealthy status', async () => {
      (global.fetch as any).mockResolvedValue({
        ok: false,
      });

      const result = await client.getHealthStatus();
      
      expect(result.healthy).toBe(false);
      expect(result.liveness.status).toBe('error');
      expect(result.recentLogs).toBeUndefined();
    });
  });

  describe('Timeout Handling', () => {
    it('should handle request timeout', async () => {
      (global.fetch as any).mockImplementation(() => 
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Timeout')), 100)
        )
      );

      const shortTimeoutClient = new BuilderNetOperatorClient({
        instanceUrl: mockUrl,
        password: mockPassword,
        timeout: 50, // Very short timeout
        enableLogging: false,
      });

      const result = await shortTimeoutClient.checkLiveness();
      expect(result.status).toBe('error');
    });
  });

  describe('Error Handling', () => {
    it('should handle network errors gracefully', async () => {
      (global.fetch as any).mockRejectedValue(new Error('Network error'));

      const result = await client.checkLiveness();
      expect(result.status).toBe('error');
    });

    it('should handle malformed responses', async () => {
      (global.fetch as any).mockResolvedValue({
        ok: true,
        text: async () => { throw new Error('Parse error'); },
      });

      await expect(client.getLogs()).rejects.toThrow();
    });
  });
});
