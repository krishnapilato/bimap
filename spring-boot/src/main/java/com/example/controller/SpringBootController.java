package com.example.controller;

import com.example.beans.FormModel;
import com.example.beans.Tables;
import com.example.beans.User;
import com.example.core.Utility;
import com.example.enums.ApplicationRole;
import com.example.enums.UserStatus;
import com.example.repository.FormModelRepository;
import com.example.repository.ListaComuniRepository;
import com.example.repository.TablesRepository;
import com.example.repository.UserRepository;
import jakarta.mail.MessagingException;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.servlet.ModelAndView;

import java.io.IOException;
import java.time.Instant;
import java.util.Date;
import java.util.List;

@RestController
@RequestMapping
@CrossOrigin(origins = "http://localhost:4200")
@RequiredArgsConstructor
public class SpringBootController {

    private static final Logger logger = LoggerFactory.getLogger(SpringBootController.class);

    private final ListaComuniRepository listaComuniRepository;
    private final FormModelRepository formModelRepository;
    private final UserRepository userRepository;
    private final TablesRepository tablesRepository;
    private final PasswordEncoder passwordEncoder;
    private final Utility utility;

    // HOME
    @GetMapping("/")
    public ModelAndView home() {
        return new ModelAndView("redirect:/home.html");
    }

    // REGIONS
    @GetMapping("/regions/{keyword}")
    public List<String> searchRegion(@PathVariable String keyword) {
        logger.info("Searching regions: {}", keyword);
        return listaComuniRepository.searchRegion(keyword);
    }

    // PROVINCES
    @GetMapping("/provinces/{keyword}")
    public List<String> searchProvince(@PathVariable String keyword) {
        logger.info("Searching provinces: {}", keyword);
        return listaComuniRepository.searchProvince(keyword);
    }

    // MUNICIPALITIES
    @GetMapping("/municipalities/{keyword}")
    public List<String> searchMunicipality(@PathVariable String keyword) {
        logger.info("Searching municipalities: {}", keyword);
        return listaComuniRepository.searchMunicipality(keyword);
    }

    // EMAIL EXISTS CHECK
    @GetMapping("/emails/{email}")
    public boolean emailExists(@PathVariable String email) {
        logger.info("Checking email existence: {}", email);
        return userRepository.findByEmail(email).isPresent();
    }

    // SAVE FORM
    @PostMapping("/form")
    public void save(@RequestBody FormModel formdata) throws IOException {
        logger.info("Saving form data");
        formModelRepository.save(formdata);
        utility.writeCSVFile(formdata);
    }

    // TABLES
    @GetMapping("/tables")
    public List<Tables> findAllTables() {
        return tablesRepository.findAll();
    }

    // USERS
    @GetMapping("/users")
    public List<User> findUsers() {
        return userRepository.findAll();
    }

    // CREATE USER
    @PostMapping("/users")
    public User create(@RequestBody CreateUserRequest request) {

        logger.info("Creating user: {}", request.email());

        var now = new Date();
        var newUser = new User();

        newUser.setName(request.name());
        newUser.setSurname(request.surname());
        newUser.setEmail(request.email());
        newUser.setPassword(passwordEncoder.encode(request.password()));
        newUser.setApplicationRole(ApplicationRole.USER);
        newUser.setUserStatus(UserStatus.CONFIRMED);
        newUser.setCreated(now.toInstant());
        newUser.setLastModified(now.toInstant());

        return userRepository.save(newUser);
    }

    public record CreateUserRequest(String name, String surname, String email, String password) {
    }

    @PatchMapping("/users/{id}")
    public User update(@RequestBody User req, @PathVariable Long id) {

        logger.info("Updating user id: {}", id);

        return userRepository.findById(id).map(user -> {

            user.setName(req.getName());
            user.setSurname(req.getSurname());
            user.setEmail(req.getEmail());
            user.setApplicationRole(req.getApplicationRole());

            if (req.getPassword() != null && !req.getPassword().isBlank()) {
                user.setPassword(passwordEncoder.encode(req.getPassword()));
            }

            user.setLastModified(Instant.now());

            return userRepository.save(user);
        }).orElseThrow(() -> new UsernameNotFoundException("User not found: " + id));
    }

    // DELETE USER
    @DeleteMapping("/users/{id}")
    public void delete(@PathVariable Long id) {
        logger.info("Deleting user: {}", id);
        userRepository.deleteById(id);
    }

    @GetMapping("/users/{email}/send-email")
    public String sendEmail(@PathVariable String email) {
        logger.info("Sending email to {}", email);

        var user = userRepository.findByEmailAddress(email).orElseThrow(() -> new UsernameNotFoundException("User not found: " + email));

        // Define the professional template as a text block
// Inside your sendEmail method:
        String content = """
                <!DOCTYPE html>
                <html>
                <body style="font-family: 'Segoe UI', Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 20px;">
                    <div style="max-width: 600px; margin: 0 auto; border: 1px solid #e0e0e0; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.1);">
                        <div style="background-color: #1976d2; padding: 25px; text-align: center; color: #ffffff;">
                            <h2 style="margin: 0;">Account Information</h2>
                        </div>
                        <div style="padding: 30px;">
                            <h3 style="margin-top: 0;">Hello %s,</h3>
                            <p>Your account has been updated in our system. Here are your credentials:</p>
                            <div style="background-color: #f4f7fa; padding: 20px; border-radius: 8px; border-left: 5px solid #1976d2; margin: 20px 0;">
                                <p style="margin: 5px 0;"><strong>Email:</strong> %s</p>
                                <p style="margin: 5px 0;"><strong>Role:</strong> %s</p>
                                <p style="margin: 15px 0 5px 0; border-top: 1px solid #d1d9e0; padding-top: 10px;">
                                    <strong>Temporary Password:</strong> <span style="background: #fff; padding: 2px 6px; border-radius: 4px; border: 1px dashed #1976d2;">%s</span>
                                </p>
                            </div>
                            <p style="font-size: 0.9em; color: #666;">Please change this password upon your first login.</p>
                        </div>
                        <div style="padding: 15px; text-align: center; font-size: 0.75rem; color: #999; background-color: #f9f9f9;">
                            &copy; 2026 BiMap. This is an automated message.
                        </div>
                    </div>
                </body>
                </html>
                """.formatted(user.getName(), user.getEmail(), user.getApplicationRole().name().toUpperCase(), "12345678");

        try {
            utility.sendEmail(email, content);
            return "Email sent to " + email;
        } catch (MessagingException e) {
            logger.error("Email failed: {}", email, e);
            return "Email failed: " + e.getMessage();
        } catch (IOException e) {
            throw new RuntimeException(e);
        }
    }
}
