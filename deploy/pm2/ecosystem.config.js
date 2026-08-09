const appRoot = `${__dirname}/../..`;

module.exports = {
    apps: [
        {
            name: "krunangfah",
            cwd: appRoot,
            script: `${appRoot}/node_modules/next/dist/bin/next`,
            args: "start --hostname 127.0.0.1 --port 3000",
            instances: 1,
            exec_mode: "fork",
            autorestart: true,
            watch: false,
            time: true,
            env: {
                NODE_ENV: "production",
                TZ: "Asia/Bangkok",
            },
        },
    ],
};
