# nuctl, the nuclio CLI, packaged with a docker client.
#
# nuclio does not publish a nuctl image, and the native Windows build cannot deploy
# to the local platform at all: it shells out to /bin/sh, which does not exist there.
# Running the Linux build in a container with the docker socket mounted works everywhere.

FROM docker:28-cli

ARG NUCTL_VERSION=1.16.3

RUN wget -q -O /usr/local/bin/nuctl \
        "https://github.com/nuclio/nuclio/releases/download/${NUCTL_VERSION}/nuctl-${NUCTL_VERSION}-linux-amd64" && \
    chmod +x /usr/local/bin/nuctl && \
    nuctl version

ENTRYPOINT ["nuctl"]
