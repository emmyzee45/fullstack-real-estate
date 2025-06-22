import { useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom"
import apiRequest from "../../lib/apiRequest";

export default function Success () {
    const location = useLocation();
    const navigate = useNavigate();
    const reference = new URLSearchParams(location.search).get('reference');
    
    useEffect(() => {
        const handlePaymentConfirmation = async () => {
            try {
                await apiRequest.get(`payment/paystack/verify?reference=${reference}`);
                navigate("/")
            }catch(err) {
                console.log(err)
            }
        }
        handlePaymentConfirmation();
    }, [reference])

    return (
        <div>
            success
        </div>
    )
}