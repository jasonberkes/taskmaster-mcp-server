import { spawn } from 'child_process';

/**
 * Execute a command and return the output
 */
export async function runCommand(
  command: string,
  workdir?: string,
  stdin?: string
): Promise<{ stdout: string; stderr: string; exitCode: number }> {
  return new Promise((resolve, reject) => {
    // Parse command and arguments
    const parts = command.split(' ');
    const cmd = parts[0];
    const args = parts.slice(1);

    const options: any = {
      shell: true,
      cwd: workdir || process.cwd(),
    };

    const childProcess = spawn(cmd, args, options);

    let stdout = '';
    let stderr = '';

    childProcess.stdout?.on('data', (data) => {
      stdout += data.toString();
    });

    childProcess.stderr?.on('data', (data) => {
      stderr += data.toString();
    });

    // Handle stdin if provided
    if (stdin && childProcess.stdin) {
      childProcess.stdin.write(stdin);
      childProcess.stdin.end();
    }

    childProcess.on('close', (code) => {
      resolve({
        stdout: stdout.trim(),
        stderr: stderr.trim(),
        exitCode: code || 0,
      });
    });

    childProcess.on('error', (error) => {
      reject(error);
    });
  });
}
