#!/bin/sh

cat kb.json | http POST https://westus.api.cognitive.microsoft.com/qnamaker/v2.0/knowledgebases/create Ocp-Apim-Subscription-Key:0d51bf1f017442c6bc7dffc3053981dd Content-Type:application/json
