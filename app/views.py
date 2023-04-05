from .app import app
from quart import render_template, make_response, request
from quart.datastructures import FileStorage
from werkzeug.datastructures import MultiDict
from werkzeug.exceptions import BadRequestKeyError, InternalServerError
import pathlib
import re


@app.route('/')
async def home():
    lang: str = request.accept_languages.best_match(app.settings.main['supported_languages'])
    headers: dict = {'Content-Type': 'text/html'}
    return await make_response(await render_template('index.html', lang=lang), 200, headers)


@app.post('/upload')
async def upload_file():
    if request.content_type.find('multipart/form-data') >= 0:
        file_info: MultiDict = await request.form
        files: MultiDict = await request.files
        file: FileStorage or None = files.get('file')
        if (len(files) != 1) or (file is None):
            raise BadRequestKeyError(
                'The method expects to receive one file with the key "file"')
    else:
        raise BadRequestKeyError(
            f'Content-Type "{request.content_type}" not supported.')
    dir_name: str or None = file_info.get('name')
    if dir_name is None:
        dir_name = 'unsorted'
    file_path: pathlib.PosixPath = app.settings.main['upload_files_directory'].joinpath(dir_name, file.filename)
    if file_path.exists():
        file_checksum: str = app.get_checksum(stream=file.stream)
        if file_checksum == app.get_checksum(file_path=str(file_path)):
            app.logger.info(
                f'From {request.remote_addr} {file_path} not upload (hash match)')
            return await make_response()
        else:
            names: list = []
            for fp in file_path.parent.glob(f'*{file_path.suffix}'):
                if re.fullmatch(r'{0} \(\d+\){1}'.format(re.escape(file_path.stem), re.escape(file_path.suffix)),
                                fp.name):
                    if file_checksum == app.get_checksum(file_path=str(fp)):
                        return await make_response()
                    names.append(fp.stem)
            index: int = 1
            if len(names) > 0:
                names.sort()
                index = int(names[-1][names[-1].rfind('(') + 1:-1]) + 1
            file_path = file_path.with_stem(f'{file_path.stem} ({index})')
    else:
        file_path.parent.mkdir(parents=True, exist_ok=True)
    app.logger.info(f'From {request.remote_addr} {file_path} uploaded')
    await file.save(file_path)
    results: list = await app.run_scripts(file_path.suffix.lower(), (str(file_path.absolute()), ))
    for result in results:
        script, return_code, _, error = result
        if return_code != 0:
            app.logger.error(f'SCRIPT ERROR: {script}: {error}')
            if app.settings.main['show_after_upload_scripts_error_on_client']:
                return await make_response(f'SCRIPT ERROR: {script}: {error}', 500)
    return await make_response()
