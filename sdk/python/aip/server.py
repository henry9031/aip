"""AIP Server — handle incoming tasks using aiohttp"""
import json
from typing import Any, Callable, Awaitable
from aiohttp import web
from .types import Manifest, Envelope, ErrorCodes
from .envelope import create_envelope, validate_envelope

TaskHandler = Callable[[str, dict[str, Any], Envelope], Awaitable[dict[str, Any]]]


class AIPServer:
    def __init__(self, manifest: Manifest) -> None:
        self.manifest = manifest
        self.handlers: dict[str, TaskHandler] = {}
        self.app = web.Application()
        self.app.router.add_get("/health", self._health)
        self.app.router.add_get("/.well-known/aip-manifest.json", self._manifest)
        self.app.router.add_post("/aip", self._handle_message)
        self.app.router.add_post("/", self._handle_message)
        self._runner: web.AppRunner | None = None

    def handle(self, capability_id: str, handler: TaskHandler) -> "AIPServer":
        self.handlers[capability_id] = handler
        return self

    async def start(self, port: int, host: str = "0.0.0.0") -> None:
        self._runner = web.AppRunner(self.app)
        await self._runner.setup()
        site = web.TCPSite(self._runner, host, port)
        await site.start()

    async def stop(self) -> None:
        if self._runner:
            await self._runner.cleanup()

    async def _health(self, _: web.Request) -> web.Response:
        return web.json_response({"status": "ok"})

    async def _manifest(self, _: web.Request) -> web.Response:
        return web.json_response(self.manifest.to_dict())

    async def _handle_message(self, req: web.Request) -> web.Response:
        data = await req.json()
        if not validate_envelope(data):
            return web.json_response({"error": "Invalid envelope"}, status=400)

        env = Envelope.from_dict(data)

        if env.type == "ping":
            pong = create_envelope("pong", self.manifest.agent.id, env.from_agent, {}, reply_to=env.id)
            return web.json_response(pong.to_dict())

        if env.type == "task.request":
            return await self._handle_task(env)

        return web.json_response({"error": f"Unsupported type: {env.type}"}, status=400)

    async def _handle_task(self, env: Envelope) -> web.Response:
        capability = env.payload.get("capability", "")
        handler = self.handlers.get(capability)

        if not handler:
            err = create_envelope(
                "task.error", self.manifest.agent.id, env.from_agent,
                {"code": ErrorCodes.CAPABILITY_NOT_FOUND, "message": f"Unknown: {capability}"},
                reply_to=env.id,
            )
            return web.json_response(err.to_dict())

        try:
            result = await handler(capability, env.payload.get("input", {}), env)
            resp = create_envelope(
                "task.result", self.manifest.agent.id, env.from_agent, result, reply_to=env.id,
            )
            return web.json_response(resp.to_dict())
        except Exception as e:
            err = create_envelope(
                "task.error", self.manifest.agent.id, env.from_agent,
                {"code": ErrorCodes.INTERNAL_ERROR, "message": str(e)},
                reply_to=env.id,
            )
            return web.json_response(err.to_dict())
