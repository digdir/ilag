# Improving this Agent

You run in the ilag Agent, made from the agent definition in `agent/` of the ilag repository: in your checkout,
`/home/agent/code/ilag/agent/`. Its `agent.yaml` is the manifest, its `Dockerfile` the image, and `instructions.md` and
this file are your instructions. When something about this machine gets in the way of your work, such as a missing
tool, a wrong setting or an instruction that is out of date, change the definition there, as the `agent-definition`
skill describes, and propose the change as a pull request like any other.

Changes to instructions take effect when the developer applies the manifest again. Changes to the image take effect
only when the Agent is created again, which deletes its disk, so say so in the pull request.
