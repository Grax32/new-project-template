export function checkDockerRunning(): boolean {
    try {
        const { execSync } = require('child_process');
        execSync('docker info', { stdio: 'pipe', timeout: 5000 });
        return true;
    } catch {
        return false;
    }
}

export function ensureDockerRunning(): void {
    if (!checkDockerRunning()) {
        console.error('❌ Docker is not running. Please start Docker Desktop or Docker Engine.');
        console.error('   On Windows: Start Docker Desktop');
        console.error('   On Linux/Mac: Run `sudo systemctl start docker` or equivalent');
        process.exit(1);
    }
}
