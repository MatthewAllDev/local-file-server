class TemplateString extends String {
    make(params) {
        const names = Object.keys(params);
        const vals = Object.values(params);
        return new Function(...names, `return \`${this}\`;`)(...vals);
    }
}

const localization = {
    onload: {
        input_files_label_text: 'Choose files',
        rename_button: 'Rename',
        dont_upload_button: 'Do not upload',
        upload_button: 'Upload'
    },
    input_files_label: new TemplateString('${count} files selected'),
    file_name_question: 'Enter name:',
    upload_progress_header_one: 'File is uploading...',
    upload_progress_header_many: 'Files are being uploaded...'
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