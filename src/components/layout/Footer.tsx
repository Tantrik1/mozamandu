import { Link } from 'react-router-dom';
import { Facebook, Instagram, Mail, Phone, MapPin } from 'lucide-react';
export function Footer() {
  return <footer className="bg-gray-900 text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {/* Company Info */}
          <div className="space-y-4">
            <div className="flex items-center space-x-3">
              <img alt="Mozamandu Logo" className="h-10 w-auto" src="/lovable-uploads/84f1077a-8761-4272-88fd-ec35838bbd2b.png" />
              <div className="flex flex-col">
                <span className="text-xl font-bold">Mozamandu</span>
                <span className="text-sm text-gray-400">Gentle on feet</span>
              </div>
            </div>
            <p className="text-gray-300 text-sm">
              Mozamandu specializes in premium socks and caps that bring comfort to your everyday style. Our products are designed to be gentle on your feet while keeping you looking stylish.
            </p>
            <div className="flex space-x-4">
              <a href="https://www.facebook.com/mozamandu2024/" className="text-gray-400 hover:text-white transition-colors">
                <Facebook className="h-5 w-5" />
              </a>
              <a href="https://www.instagram.com/mozamandu2024/?hl=en" className="text-gray-400 hover:text-white transition-colors">
                <Instagram className="h-5 w-5" />
              </a>
            </div>
          </div>

          {/* Quick Links */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">कम्पनी दर्ता विवरण</h3>
            <div className="text-sm text-gray-300 space-y-2">
              <p>विधुतीय प्लेटफर्ममा कम्पनी/फर्मको नाम - मोजामान्डु</p>
              <p>दर्ता नं-: १६३</p>
              <p>प्यान नम्बर: १०८६२४५९५</p>
              <p>गुनासो सुन्ने व्यक्तीको नाम: रोजल लामा</p>
              <p>फोन नम्बर: ९७६१६९१२७६</p>
            </div>
          </div>

          {/* Company */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Company</h3>
            <ul className="space-y-2 text-sm">
              <li><Link to="/about" className="text-gray-300 hover:text-white transition-colors">About Us</Link></li>
              <li><Link to="/contact" className="text-gray-300 hover:text-white transition-colors">Contact Us</Link></li>
              <li><Link to="/terms" className="text-gray-300 hover:text-white transition-colors">Terms & Conditions</Link></li>
              <li><Link to="/privacy" className="text-gray-300 hover:text-white transition-colors">Privacy Policy</Link></li>
              <li><Link to="/shipping" className="text-gray-300 hover:text-white transition-colors">Shipping & Refunds</Link></li>
            </ul>
          </div>

          {/* Contact Us */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Contact Us</h3>
            <div className="space-y-3 text-sm">
              <div className="flex items-center space-x-2">
                <MapPin className="h-4 w-4 text-red-500" />
                <span className="text-gray-300">Kathmandu, Nepal</span>
              </div>
              <div className="flex items-center space-x-2">
                <Phone className="h-4 w-4 text-red-500" />
                <span className="text-gray-300">+977 9761691276</span>
              </div>
              <div className="flex items-center space-x-2">
                <Mail className="h-4 w-4 text-red-500" />
                <span className="text-gray-300">info@mozamandu.com</span>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="border-t border-gray-800 mt-8 pt-8">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <p className="text-gray-400 text-sm">© 2025 Mozamandu. All rights reserved.</p>
            <div className="flex space-x-4 mt-4 md:mt-0">
              <Link to="/about" className="text-gray-400 hover:text-white text-xs transition-colors">About Us</Link>
              <Link to="/contact" className="text-gray-400 hover:text-white text-xs transition-colors">Contact</Link>
              <Link to="/terms" className="text-gray-400 hover:text-white text-xs transition-colors">Terms</Link>
              <Link to="/privacy" className="text-gray-400 hover:text-white text-xs transition-colors">Privacy</Link>
              <Link to="/shipping" className="text-gray-400 hover:text-white text-xs transition-colors">Shipping & Returns</Link>
            </div>
          </div>
        </div>
      </div>
    </footer>;
}