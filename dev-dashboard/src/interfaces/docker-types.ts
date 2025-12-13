export interface DockerPsContainer {
    Command: string;
    CreatedAt: string; // could be Date if you parse it
    ExitCode: number;
    Health: string;
    ID: string;
    Image: string;
    Labels: Record<string, string>;
    LocalVolumes: string;
    Mounts: string;
    Name: string;
    Names: string;
    Networks: string;
    Ports: string;
    Project: string;
    Publishers: Array<{
        URL: string;
        TargetPort: number;
        PublishedPort: number;
        Protocol: string;
    }>;
    RunningFor: string;
    Service: string;
    Size: string;
    State: string;
    Status: string;
}

export interface DockerInspectContainer {
    Id: string;
    Created: string; // ISO string
    Path: string;
    Args: string[];
    State: {
        Status: string;
        Running: boolean;
        Paused: boolean;
        Restarting: boolean;
        OOMKilled: boolean;
        Dead: boolean;
        Pid: number;
        ExitCode: number;
        Error: string;
        StartedAt: string;
        FinishedAt: string;
        Health?: {
            Status: string;
            FailingStreak: number;
            Log: Array<{
                Start: string;
                End: string;
                ExitCode: number;
                Output: string;
            }>;
        };
    };
    Image: string;
    ResolvConfPath: string;
    HostnamePath: string;
    HostsPath: string;
    LogPath: string;
    Name: string;
    RestartCount: number;
    Driver: string;
    Platform: string;
    MountLabel: string;
    ProcessLabel: string;
    AppArmorProfile: string;
    ExecIDs: string[] | null;
    HostConfig: {
        Binds: string[];
        ContainerIDFile: string;
        LogConfig: {
            Type: string;
            Config: Record<string, unknown>;
        };
        NetworkMode: string;
        PortBindings: Record<
            string,
            Array<{
                HostIp: string;
                HostPort: string;
            }>
        >;
        RestartPolicy: {
            Name: string;
            MaximumRetryCount: number;
        };
        AutoRemove: boolean;
        VolumeDriver: string;
        VolumesFrom: string[] | null;
        ConsoleSize: [number, number];
        CapAdd: string[] | null;
        CapDrop: string[] | null;
        CgroupnsMode: string;
        Dns: string[] | null;
        DnsOptions: string[] | null;
        DnsSearch: string[] | null;
        ExtraHosts: string[];
        GroupAdd: string[] | null;
        IpcMode: string;
        Cgroup: string;
        Links: string[] | null;
        OomScoreAdj: number;
        PidMode: string;
        Privileged: boolean;
        PublishAllPorts: boolean;
        ReadonlyRootfs: boolean;
        SecurityOpt: string[] | null;
        UTSMode: string;
        UsernsMode: string;
        ShmSize: number;
        Runtime: string;
        Isolation: string;
        CpuShares: number;
        Memory: number;
        NanoCpus: number;
        CgroupParent: string;
        BlkioWeight: number;
        BlkioWeightDevice: unknown;
        BlkioDeviceReadBps: unknown;
        BlkioDeviceWriteBps: unknown;
        BlkioDeviceReadIOps: unknown;
        BlkioDeviceWriteIOps: unknown;
        CpuPeriod: number;
        CpuQuota: number;
        CpuRealtimePeriod: number;
        CpuRealtimeRuntime: number;
        CpusetCpus: string;
        CpusetMems: string;
        Devices: unknown;
        DeviceCgroupRules: unknown;
        DeviceRequests: unknown;
        MemoryReservation: number;
        MemorySwap: number;
        MemorySwappiness: number | null;
        OomKillDisable: boolean | null;
        PidsLimit: number | null;
        Ulimits: unknown;
        CpuCount: number;
        CpuPercent: number;
        IOMaximumIOps: number;
        IOMaximumBandwidth: number;
        MaskedPaths: string[];
        ReadonlyPaths: string[];
    };
    GraphDriver: {
        Data: {
            ID: string;
            LowerDir: string;
            MergedDir: string;
            UpperDir: string;
            WorkDir: string;
        };
        Name: string;
    };
    Mounts: Array<{
        Type: string;
        Source: string;
        Destination: string;
        Mode: string;
        RW: boolean;
        Propagation: string;
    }>;
    Config: {
        Hostname: string;
        Domainname: string;
        User: string;
        AttachStdin: boolean;
        AttachStdout: boolean;
        AttachStderr: boolean;
        ExposedPorts?: Record<string, never>;
        Tty: boolean;
        OpenStdin: boolean;
        StdinOnce: boolean;
        Env: string[];
        Cmd: string[];
        Healthcheck?: {
            Test: string[];
            Interval: number;
            Timeout: number;
            Retries: number;
        };
        Image: string;
        Volumes: Record<string, unknown> | null;
        WorkingDir: string;
        Entrypoint: string[];
        OnBuild: unknown;
        Labels: Record<string, string>;
        StopTimeout: number;
    };
    NetworkSettings: {
        Bridge: string;
        SandboxID: string;
        SandboxKey: string;
        Ports: Record<
            string,
            Array<{
                HostIp: string;
                HostPort: string;
            }>
        >;
        HairpinMode: boolean;
        LinkLocalIPv6Address: string;
        LinkLocalIPv6PrefixLen: number;
        SecondaryIPAddresses: string[] | null;
        SecondaryIPv6Addresses: string[] | null;
        EndpointID: string;
        Gateway: string;
        GlobalIPv6Address: string;
        GlobalIPv6PrefixLen: number;
        IPAddress: string;
        IPPrefixLen: number;
        IPv6Gateway: string;
        MacAddress: string;
        Networks: Record<
            string,
            {
                IPAMConfig: unknown;
                Links: string[] | null;
                Aliases: string[];
                MacAddress: string;
                DriverOpts: unknown;
                GwPriority: number;
                NetworkID: string;
                EndpointID: string;
                Gateway: string;
                IPAddress: string;
                IPPrefixLen: number;
                IPv6Gateway: string;
                GlobalIPv6Address: string;
                GlobalIPv6PrefixLen: number;
                DNSNames: string[];
            }
        >;
    };
}
