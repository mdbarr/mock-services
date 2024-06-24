#!/bin/bash
set -o errexit

MULTIPLATFORM=0
NAME="mock-services"
PLATFORMS="arm64 amd64"
REGISTRY=""
TAG="latest"

createManifest() {
    local image="$1"
    shift
    local images="$@"

    docker manifest rm "${REGISTRY}${image}"

    docker manifest create "${REGISTRY}${image}" $images

    docker manifest inspect "${REGISTRY}${image}"

    docker manifest push "${REGISTRY}${image}"
}

multiPlatformBuild() {
    local image="$1"
    local images=""

    for arch in $PLATFORMS; do
        docker build --no-cache --platform "linux/${arch}" -t "${REGISTRY}${image}-${arch}" .
        docker push "${REGISTRY}${image}-${arch}"
        images+=" ${REGISTRY}${image}-${arch}"
    done

    createManifest $image $images
}

build() {
    local image="$1"
    docker build -t "${REGISTRY}${image}" .
}

##########
# CLI Options

while [ $# -gt 0 ]; do
    case "$1" in
        --multiplatform | --multi-platform)
            MULTIPLATFORM=1
            ;;
        --name)
            NAME="$2"
            shift
            ;;
        --registry)
            REGISTRY="$2"
            shift

            if [[ "$REGISTRY" != */ ]]; then
                REGISTRY="${REGISTRY}/"
            fi
            ;;
        --tag)
            TAG="$2"
            shift
            ;;
    esac
    shift
done

##########

yarn build

if [[ "$MULTIPLATFORM" == "1" ]]; then
    multiPlatformBuild "${NAME}:${TAG}"
else
    build "${NAME}:${TAG}"
fi
