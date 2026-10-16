#!/usr/bin/env bash

# Configuración del despliegue de PlayNSeek
export AWS_REGION="us-east-1"
export PROJECT_NAME="playnseek"

# Red existente del Learner Lab
export VPC_ID="vpc-06c0eb94897f503c7"
export SUBNET_ID="subnet-0d1fe38a2d145bc82"

# Perfil existente que contiene LabRole
export INSTANCE_PROFILE="LabInstanceProfile"