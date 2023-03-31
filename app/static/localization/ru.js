class TemplateString extends String {
    make(params) {
        const names = Object.keys(params);
        const vals = Object.values(params);
        return new Function(...names, `return \`${this}\`;`)(...vals);
    }
}

const localization = {
    onload: {
        input_files_label_text: 'Выберите файлы',
        rename_button: 'Переименовать',
        dont_upload_button: 'Не загружать',
        upload_button: 'Загрузить'
    },
    input_files_label: new TemplateString('Выбрано ${count} файлов'),
    file_name_question: 'Введите наименование:',
    upload_progress_header_one: 'Идет загрузка файла...',
    upload_progress_header_many: 'Идет загрузка файлов...'
}

document.addEventListener("DOMContentLoaded", () => {
    for (id in localization.onload) {
        let target = document.getElementById(id);
        if (target === null) continue;
        if (target.tagName === "INPUT") {
            target.setAttribute('value', localization.onload[id]);
        } else {
            target.append(document.createTextNode(localization.onload[id]))
        }
    }
})