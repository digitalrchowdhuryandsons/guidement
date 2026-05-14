import jsPDF from "jspdf";

interface CertificateData {
  studentName: string;
  courseName: string;
  instructorName: string;
  completionDate: Date;
}

export function generateCertificate(data: CertificateData) {
  const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
  const width = doc.internal.pageSize.getWidth();
  const height = doc.internal.pageSize.getHeight();

  // Background
  doc.setFillColor(15, 15, 20);
  doc.rect(0, 0, width, height, "F");

  // Border accent
  doc.setDrawColor(139, 92, 246);
  doc.setLineWidth(1.5);
  doc.roundedRect(10, 10, width - 20, height - 20, 4, 4, "S");

  // Inner border
  doc.setDrawColor(139, 92, 246, 0.3);
  doc.setLineWidth(0.3);
  doc.roundedRect(14, 14, width - 28, height - 28, 3, 3, "S");

  // Top accent line
  const gradient_start_x = width / 2 - 60;
  doc.setDrawColor(139, 92, 246);
  doc.setLineWidth(2);
  doc.line(gradient_start_x, 30, gradient_start_x + 120, 30);

  // Platform name
  doc.setTextColor(139, 92, 246);
  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.text("GUIDEMENT", width / 2, 42, { align: "center" });

  // Certificate title
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(32);
  doc.setFont("helvetica", "bold");
  doc.text("Certificate of Completion", width / 2, 60, { align: "center" });

  // Decorative line
  doc.setDrawColor(255, 255, 255, 0.2);
  doc.setLineWidth(0.5);
  doc.line(width / 2 - 50, 66, width / 2 + 50, 66);

  // "This certifies that"
  doc.setTextColor(180, 180, 190);
  doc.setFontSize(12);
  doc.setFont("helvetica", "normal");
  doc.text("This certifies that", width / 2, 80, { align: "center" });

  // Student name
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(28);
  doc.setFont("helvetica", "bold");
  doc.text(data.studentName || "Student", width / 2, 95, { align: "center" });

  // "has successfully completed"
  doc.setTextColor(180, 180, 190);
  doc.setFontSize(12);
  doc.setFont("helvetica", "normal");
  doc.text("has successfully completed the course", width / 2, 110, { align: "center" });

  // Course name
  doc.setTextColor(139, 92, 246);
  doc.setFontSize(22);
  doc.setFont("helvetica", "bold");
  const courseLines = doc.splitTextToSize(data.courseName, width - 80);
  doc.text(courseLines, width / 2, 125, { align: "center" });

  const yAfterCourse = 125 + courseLines.length * 10;

  // Instructor
  doc.setTextColor(180, 180, 190);
  doc.setFontSize(11);
  doc.setFont("helvetica", "normal");
  doc.text(`Instructor: ${data.instructorName}`, width / 2, yAfterCourse + 10, { align: "center" });

  // Date
  const dateStr = data.completionDate.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
  doc.text(`Completed on ${dateStr}`, width / 2, yAfterCourse + 20, { align: "center" });

  // Bottom accent line
  doc.setDrawColor(139, 92, 246);
  doc.setLineWidth(2);
  doc.line(gradient_start_x, height - 30, gradient_start_x + 120, height - 30);

  // Footer
  doc.setTextColor(100, 100, 110);
  doc.setFontSize(8);
  doc.text("guidement.com", width / 2, height - 22, { align: "center" });

  doc.save(`Guidement-Certificate-${data.courseName.replace(/\s+/g, "-")}.pdf`);
}
