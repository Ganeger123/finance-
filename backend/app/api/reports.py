from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from app.models.base import get_db
from app.api.deps import require_approved_user, get_audit_logger
from app.models.user import User
from app.services.pdf_service import PdfService
import datetime

router = APIRouter()

@router.get("/monthly-pdf")
def get_monthly_report_pdf(
    month: int,
    year: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_approved_user),
    audit_log = Depends(get_audit_logger)
):
    """
    Generate and download a monthly financial report PDF.
    """
    try:
        # Validate inputs
        if not (1 <= month <= 12):
             raise HTTPException(status_code=400, detail="Invalid month")
        
        pdf_buffer = PdfService.generate_monthly_report(db, year, month)
        
        # Log action
        audit_log(
            action="DOWNLOAD_REPORT",
            resource_type="report",
            details={"month": month, "year": year}
        )

        filename = f"Rapport_Financier_{year}_{month:02d}.pdf"
        
        headers = {
            'Content-Disposition': f'attachment; filename="{filename}"'
        }
        
        return StreamingResponse(pdf_buffer, media_type="application/pdf", headers=headers)

    except Exception as e:
        print(f"Error generating PDF: {e}")
        raise HTTPException(status_code=500, detail="Could not generate report")
