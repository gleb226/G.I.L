import sys

file_path = r'A:\Sync\G.I.L\Site\js\appartmentsPage.js'
with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

target = '''            visibleGallery.forEach((galleryImage, index) => {
                const img = document.createElement("img");
                const src = window.getAssetUrl(galleryImage);
                img.src = src;
                img.alt = apartmentTitle;
                img.className = "thumb_image";
                img.loading = "lazy";
                img.onerror = () => {
                    img.src = window.getAssetUrl("images/logo.png");
                };
                img.addEventListener("click", () => {
                    updateMainStage(index);
                });
                thumbsContainer.appendChild(img);
            });'''

replacement = '''            visibleGallery.forEach((galleryImage, index) => {
                const wrapper = document.createElement("div");
                wrapper.className = "thumb_wrapper";
                wrapper.style.display = "flex";
                wrapper.style.alignItems = "center";
                wrapper.style.gap = "0.5rem";

                const num = document.createElement("span");
                num.textContent = index + 1;
                num.style.fontWeight = "bold";
                num.style.minWidth = "1.2rem";

                const img = document.createElement("img");
                const src = window.getAssetUrl(galleryImage);
                img.src = src;
                img.alt = apartmentTitle;
                img.className = "thumb_image";
                img.loading = "lazy";
                img.onerror = () => {
                    img.src = window.getAssetUrl("images/logo.png");
                };
                img.addEventListener("click", () => {
                    updateMainStage(index);
                });

                wrapper.appendChild(num);
                wrapper.appendChild(img);
                thumbsContainer.appendChild(wrapper);
            });'''

if target in content:
    with open(file_path, 'w', encoding='utf-8') as f:
        f.write(content.replace(target, replacement))
    print('Updated appartmentsPage.js')
else:
    print('Target not found.')
