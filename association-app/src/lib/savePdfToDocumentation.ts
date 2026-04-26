import { supabase } from "@/lib/supabaseClient";

export async function savePdfToDocumentation({
  element,
  fileName,
  target = "MEMBRE",
}: {
  element: HTMLElement;
  fileName: string;
  target?: "MEMBRE" | "BUREAU" | "ASSOCIATION";
}) {
  if (typeof window === "undefined") {
    throw new Error("La génération PDF doit être lancée depuis le navigateur.");
  }

  if (!element) {
    throw new Error("Element introuvable");
  }

  const html2canvasModule = await import("html2canvas");
  const html2canvas = html2canvasModule.default;

  const jspdfModule = await import("jspdf/dist/jspdf.umd.min.js");
  const jsPDF = (jspdfModule as any).jsPDF || (jspdfModule as any).default?.jsPDF;

  if (!jsPDF) {
    throw new Error("jsPDF introuvable.");
  }

  const wrapper = document.createElement("div");
  wrapper.setAttribute("data-pdf-safe-wrapper", "true");

  wrapper.style.position = "fixed";
  wrapper.style.left = "-100000px";
  wrapper.style.top = "0";
  wrapper.style.width = "794px";
  wrapper.style.minHeight = "1123px";
  wrapper.style.background = "#020617";
  wrapper.style.padding = "24px";
  wrapper.style.boxSizing = "border-box";
  wrapper.style.overflow = "visible";

  const clone = element.cloneNode(true) as HTMLElement;

  clone.style.width = "746px";
  clone.style.maxWidth = "746px";
  clone.style.minWidth = "746px";
  clone.style.background = "#020617";
  clone.style.color = "#ffffff";
  clone.style.boxSizing = "border-box";

  wrapper.appendChild(clone);
  document.body.appendChild(wrapper);

  try {
    const nodes = wrapper.querySelectorAll<HTMLElement>("*");

    nodes.forEach((node) => {
      node.removeAttribute("class");

      node.style.color = "#ffffff";
      node.style.backgroundImage = "none";
      node.style.boxShadow = "none";
      node.style.textShadow = "none";
      node.style.outline = "none";
      node.style.borderColor = "#164e63";
      node.style.caretColor = "#ffffff";
      node.style.accentColor = "#06b6d4";
      node.style.fontFamily = "Arial, Helvetica, sans-serif";
      node.style.boxSizing = "border-box";

      const tag = node.tagName.toLowerCase();

      if (tag === "button") {
        node.style.display = "none";
      }

      if (tag === "p") {
        node.style.margin = "0 0 8px 0";
        node.style.fontSize = "13px";
        node.style.lineHeight = "1.5";
        node.style.color = "#cbd5e1";
      }

      if (tag === "h1") {
        node.style.margin = "8px 0";
        node.style.fontSize = "28px";
        node.style.lineHeight = "1.2";
        node.style.fontWeight = "700";
        node.style.color = "#ffffff";
      }

      if (tag === "h2") {
        node.style.margin = "8px 0";
        node.style.fontSize = "20px";
        node.style.lineHeight = "1.25";
        node.style.fontWeight = "700";
        node.style.color = "#ffffff";
      }

      if (tag === "div") {
        node.style.borderRadius = "18px";
      }
    });

    const blocks = clone.querySelectorAll<HTMLElement>("div");
    blocks.forEach((block) => {
      const text = (block.textContent ?? "").trim();

      if (text.length > 0) {
        block.style.backgroundColor = "#04112b";
        block.style.border = "1px solid #164e63";
        block.style.padding = block.style.padding || "14px";
        block.style.marginBottom = block.style.marginBottom || "12px";
      }
    });

    const canvas = await html2canvas(wrapper, {
      scale: 1,
      useCORS: true,
      backgroundColor: "#020617",
      logging: false,
      windowWidth: 794,
      windowHeight: Math.max(1123, wrapper.scrollHeight),
    });

    const imgData = canvas.toDataURL("image/jpeg", 0.72);
    const pdf = new jsPDF("p", "mm", "a4");

    const pageWidth = 210;
    const pageHeight = 297;
    const imgHeight = (canvas.height * pageWidth) / canvas.width;

    let heightLeft = imgHeight;
    let position = 0;

    pdf.addImage(imgData, "JPEG", 0, position, pageWidth, imgHeight);
    heightLeft -= pageHeight;

    while (heightLeft > 0) {
      position = heightLeft - imgHeight;
      pdf.addPage();
      pdf.addImage(imgData, "JPEG", 0, position, pageWidth, imgHeight);
      heightLeft -= pageHeight;
    }

    const blob = pdf.output("blob");

    const cleanFileName = fileName
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-zA-Z0-9-_]/g, "-")
      .replace(/-+/g, "-")
      .toLowerCase();

    const storagePath = `documents/${Date.now()}_${cleanFileName}.pdf`;

    const { error: uploadError } = await supabase.storage
      .from("documentation")
      .upload(storagePath, blob, {
        contentType: "application/pdf",
        upsert: false,
      });

    if (uploadError) {
      throw new Error("Upload échoué : " + uploadError.message);
    }

    const { data: folderId, error: folderError } = await supabase.rpc(
      "fn_get_print_target_folder_id",
      { p_target: target }
    );

    if (folderError || !folderId) {
      throw new Error("Erreur dossier : " + (folderError?.message ?? "Dossier introuvable"));
    }

    const { error: insertError } = await supabase
      .from("documentation_documents")
      .insert({
        folder_id: folderId,
        nom_original: `${cleanFileName}.pdf`,
        nom_stockage: `${cleanFileName}.pdf`,
        chemin_storage: storagePath,
        mime_type: "application/pdf",
        taille_bytes: blob.size,
        source_type: "IMPRESSION_APP",
      });

    if (insertError) {
      throw new Error("Erreur enregistrement : " + insertError.message);
    }

    return true;
  } finally {
    if (wrapper.parentNode) {
      wrapper.parentNode.removeChild(wrapper);
    }
  }
}

