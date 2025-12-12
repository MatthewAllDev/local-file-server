from .settings import Settings
from quart import Quart
from typing import IO
from hashlib import md5
import asyncio
import typing
import os
import webbrowser


class App(Quart):
    settings: Settings

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.settings: Settings = Settings()
        self.settings.load()

    def open_in_browser(self) -> None:
        url: str = f"http://{self.settings.main['host']}:{self.settings.main['port']}"
        webbrowser.open(url)

    def run(self,
            use_reloader: bool = True,
            loop: typing.Optional[asyncio.AbstractEventLoop] = None,
            **kwargs: typing.Any
            ) -> None:
        super().run(self.settings.main['host'],
                    self.settings.main['port'],
                    self.settings.main['debug'],
                    use_reloader,
                    loop,
                    self.settings.main['ca_certs'],
                    self.settings.main['certfile'],
                    self.settings.main['keyfile'],
                    **kwargs)

    async def run_scripts(self, key: str, arguments: tuple) -> typing.List[typing.Tuple[str, int, str, str]]:
        scripts: list = self.settings.main['after_upload_scripts'].get(key)
        if scripts is None:
            return []
        if type(scripts) == str:
            scripts = [scripts]
        results: typing.List[typing.Tuple[str, int, str, str]] = list()
        for script_cmd in scripts:
            script: list = script_cmd.split(' ')
            for argument in arguments:
                script.append(str(argument))
            results.append(await self.__run_script(script))
        return results

    async def __run_script(self, script: list) -> typing.Tuple[str, int, str, str]:
        if os.name == "nt":
            if "WT_SESSION" in os.environ or os.environ.get("TERM"):
                enc = "utf-8"
            enc = "cp866"
        enc = "utf-8"
        proc: asyncio.subprocess.Process = await asyncio.create_subprocess_exec(*script,
                                                                                stdout=asyncio.subprocess.PIPE,
                                                                                stderr=asyncio.subprocess.PIPE,
                                                                                cwd=self.settings.main['scripts_dir'])
        stdout, stderr = await proc.communicate()
        out: str = stdout.decode(enc, errors="replace") if stdout else ''
        err: str = stderr.decode(enc, errors="replace") if stderr else ''
        return ' '.join(script), proc.returncode, out, err

    @staticmethod
    def get_checksum(stream: IO[bytes] = None, file_path: str = None):
        if (stream is None) == (file_path is None):
            raise TypeError(
                'Method takes only one filled argument: stream or file_path.')
        if file_path is not None:
            stream: IO[bytes] = open(file_path, 'rb')
        try:
            checksum = md5()
            for chunk in iter(lambda: stream.read(128 * checksum.block_size), b''):
                checksum.update(chunk)
        except Exception as exception:
            if file_path is not None:
                stream.close()
            raise exception
        stream.seek(0)
        return checksum.hexdigest()


app: App = App(__name__)
