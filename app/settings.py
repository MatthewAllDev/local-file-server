import json
import os
import pathlib
from logging.config import dictConfig


class Settings:
    main: dict = dict()
    logging: dict = dict()

    def __init__(self):
        self.main['upload_files_directory'] = pathlib.Path('upload')
        self.main['scripts_dir']: str = pathlib.Path('app/scripts').absolute()
        self.main['after_upload_scripts']: dict = {}
        self.main['host']: str = None
        self.main['port']: int = None
        self.main['debug']: bool = None
        self.main['ca_certs']: str = None
        self.main['certfile']: str = None
        self.main['keyfile']: str = None
        self.main['supported_languages']: tuple = tuple(map(lambda x: x.stem,
                                                            pathlib.Path('app/static/localization').glob('*.js')))
        self.main['show_after_upload_scripts_error_on_client'] = False

    def load(self):
        config_path: pathlib.Path = pathlib.Path('app/config')
        for file_path in config_path.glob('*.json'):
            file_path: pathlib.PosixPath
            with open(file_path, 'r', encoding='utf-8') as json_file:
                try:
                    settings_namespace: dict = getattr(self, file_path.stem)
                except AttributeError:
                    raise AttributeError(
                        f'Settings namespace {file_path.stem} does not exist')
                settings_items: dict = json.load(json_file)
                for key, value in settings_items.items():
                    settings_namespace[key] = value
        self.__after_load()

    def __after_load(self):
        if type(self.main['upload_files_directory']) == str:
            self.main['upload_files_directory'] = pathlib.Path(self.main['upload_files_directory'])
        if not self.main['upload_files_directory'].exists():
            self.main['upload_files_directory'].mkdir(parents=True)
        if not os.access(self.main['upload_files_directory'], os.R_OK | os.W_OK):
            raise RuntimeError(f'The application does not have read or write access to the upload_files_directory: '
                               f'{self.main["upload_files_directory"]}')
        if not os.path.exists('logs'):
            os.mkdir('logs')
        dictConfig(self.logging)
